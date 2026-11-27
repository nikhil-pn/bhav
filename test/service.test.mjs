// End-to-end tests for Bhav's service and its buyer agent.
// The real app (src/app.mjs), the real buyer agent (src/agent.mjs), the real Self Agent ID
// verifier and the real x402 libraries run here; only the chain and the facilitator are local
// fakes (test/fakes.mjs), and prices come from a stub. No network, no keys, no money.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { getAddress } from 'viem';
import { SelfAgent, SelfAgentVerifier } from '@selfxyz/agent-sdk';
import { createApp, NETWORKS } from '../src/app.mjs';
import { createBuyerFetch, readReceipt } from '../src/agent.mjs';
import { startFakeRegistry, fakeFacilitator, SELF_PROVIDER } from './fakes.mjs';

const PAY_TO = '0x33A80697Ac038279ca8d70F4c2Cef82672683b9F';
const USDC = getAddress(NETWORKS.mainnet.usdc);
let registry;
const dirs = [];
const servers = [];

before(async () => { registry = await startFakeRegistry(); });
after(() => { registry.close(); for (const s of servers) s.close(); for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

/** A fresh Bhav on a random port, wired to the fake registry + facilitator. */
async function startBhav(opts = {}) {
  const dataDir = opts.dataDir ?? mkdtempSync(join(tmpdir(), 'bhav-test-'));
  dirs.push(dataDir);
  const facilitator = opts.facilitator ?? fakeFacilitator();
  const verifier = SelfAgentVerifier.create().network('mainnet').rpc(registry.url).sybilLimit(10).includeCredentials().build();
  const lookups = [];
  const app = createApp({
    net: 'mainnet', payTo: PAY_TO, verifier, facilitator, dataDir,
    quote: opts.quote ?? (async (q) => { lookups.push(q); return { q, answer: `Cheapest ${q}: ₹99 on Zepto`, offers: [{ store: 'zepto', price: 99 }] }; }),
    priceAtomic: opts.priceAtomic, freePerDay: opts.freePerDay ?? 3, now: opts.now, demoGapMs: opts.demoGapMs ?? 0,
  });
  const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  servers.push(server);
  return { base: `http://127.0.0.1:${server.address().port}`, facilitator, lookups, dataDir, close: () => server.close() };
}

let nextId = 500;
/** A new agent key; `human` = the Self nullifier it is registered under (omit = not registered). */
function newAgent({ human, ...flags } = {}) {
  const key = generatePrivateKey();
  const address = privateKeyToAccount(key).address;
  if (human !== undefined) registry.agents.set(address.toLowerCase(), { id: nextId++, human, ...flags });
  return { key, address };
}
const buyerFor = (agent, o = {}) => createBuyerFetch({ privateKey: agent.key, net: 'mainnet', rpcUrl: registry.url, ...o });
const quoteUrl = (bhav, q = 'eggs 30') => `${bhav.base}/v1/quote?q=${encodeURIComponent(q)}`;
const events = (bhav) => readFileSync(join(bhav.dataDir, 'events.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

// ── The gate ────────────────────────────────────────────────────────────────

test('health shows network, payee and price', async () => {
  const bhav = await startBhav();
  const r = await (await fetch(`${bhav.base}/health`)).json();
  assert.deepEqual(r, { ok: true, network: 'mainnet', payTo: PAY_TO, freePerDay: 3, price: '$0.01 USDC' });
});

test('an agent with no Self Agent ID is refused and never reaches the price lookup', async () => {
  const bhav = await startBhav();
  const res = await fetch(quoteUrl(bhav));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, 'human_backed_agents_only');
  assert.equal(bhav.lookups.length, 0);
  assert.equal(events(bhav)[0].reason, 'no_self_agent_id');
});

test('a signed agent with no human behind it (not in the registry) is refused', async () => {
  const bhav = await startBhav();
  const res = await buyerFor(newAgent()).fetch(quoteUrl(bhav));
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error, 'not_a_verified_human_backed_agent');
  assert.match(body.reason, /not verified/i);
  assert.equal(bhav.lookups.length, 0);
});

test('an agent whose human proof has expired is refused', async () => {
  const bhav = await startBhav();
  const res = await buyerFor(newAgent({ human: 7001, fresh: false })).fetch(quoteUrl(bhav));
  assert.equal(res.status, 403);
  assert.match((await res.json()).reason, /expired/i);
});

test('an agent proven by someone other than Self is refused', async () => {
  const bhav = await startBhav();
  const res = await buyerFor(newAgent({ human: 7002, provider: '0x000000000000000000000000000000000000bad1' })).fetch(quoteUrl(bhav));
  assert.equal(res.status, 403);
  assert.match((await res.json()).reason, /provider/i);
});

test('a captured signature cannot be replayed, or reused for a different question', async () => {
  const bhav = await startBhav();
  const agent = newAgent({ human: 7003 });
  const self = new SelfAgent({ privateKey: agent.key, network: 'mainnet' });
  const url = quoteUrl(bhav, 'eggs 30');
  const headers = await self.signRequest('GET', url);
  assert.equal((await fetch(url, { headers })).status, 200);
  const replay = await fetch(url, { headers });
  assert.equal(replay.status, 403);
  assert.match((await replay.json()).reason, /replay/i);
  // Same headers on another URL: the recovered signer no longer matches, so it is not this agent.
  const swapped = await fetch(quoteUrl(bhav, 'rice 5kg'), { headers: await self.signRequest('GET', url) });
  assert.equal(swapped.status, 403);
  assert.equal(bhav.lookups.length, 1);
});

test('a question is required', async () => {
  const bhav = await startBhav();
  const res = await buyerFor(newAgent({ human: 7004 })).fetch(`${bhav.base}/v1/quote?q=`);
  assert.equal(res.status, 400);
});

// ── Free quota per human, then x402 ─────────────────────────────────────────

test('human-backed agent: 3 free answers, then it pays $0.01 USDC over x402 and gets the answer', async () => {
  const bhav = await startBhav();
  const agent = newAgent({ human: 8001 });
  const buyer = buyerFor(agent);
  for (const left of [2, 1, 0]) {
    const res = await buyer.fetch(quoteUrl(bhav));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.billing, { kind: 'free', freeLeftToday: left });
    assert.equal(body.agent.address, agent.address);
    assert.equal(readReceipt(res), undefined);
  }
  assert.equal(bhav.facilitator.settled.length, 0);

  const res = await buyer.fetch(quoteUrl(bhav, 'chicken curry cut'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.billing.kind, 'paid');
  assert.equal(body.answer, 'Cheapest chicken curry cut: ₹99 on Zepto');

  // The facilitator saw a valid EIP-3009 signature for exactly $0.01 USDC to Bhav, from this agent.
  assert.equal(bhav.facilitator.settled.length, 1);
  const s = bhav.facilitator.settled[0];
  assert.deepEqual([getAddress(s.from), getAddress(s.to), String(s.value), getAddress(s.asset)], [agent.address, PAY_TO, '10000', USDC]);
  const receipt = readReceipt(res);
  assert.equal(receipt.success, true);
  assert.equal(receipt.transaction, s.tx);
  assert.equal(receipt.network, 'eip155:42220');

  // The paid answer is logged with its settlement tx once the response is out.
  await new Promise((r) => setTimeout(r, 50));
  const paid = events(bhav).filter((e) => e.kind === 'paid');
  assert.equal(paid.length, 1);
  assert.equal(paid[0].settlement.tx, s.tx);
});

test('over the quota, an agent that does not pay gets 402 with the exact price terms', async () => {
  const bhav = await startBhav({ freePerDay: 0 });
  const agent = newAgent({ human: 8002 });
  const self = new SelfAgent({ privateKey: agent.key, network: 'mainnet' });
  const url = quoteUrl(bhav);
  const res = await fetch(url, { headers: await self.signRequest('GET', url) });
  assert.equal(res.status, 402);
  const terms = JSON.parse(Buffer.from(res.headers.get('payment-required'), 'base64').toString());
  const accept = terms.accepts[0];
  assert.equal(accept.scheme, 'exact');
  assert.equal(accept.network, 'eip155:42220');
  assert.equal(accept.amount, '10000');
  assert.equal(getAddress(accept.asset), USDC);
  assert.equal(getAddress(accept.payTo), PAY_TO);
  assert.equal(bhav.lookups.length, 0, 'no answer without payment');
});

test('the free quota belongs to the human: a second agent of the same person does not get more', async () => {
  const bhav = await startBhav({ freePerDay: 2 });
  const first = buyerFor(newAgent({ human: 8003 }));
  const second = buyerFor(newAgent({ human: 8003 }));
  assert.equal((await (await first.fetch(quoteUrl(bhav))).json()).billing.kind, 'free');
  assert.equal((await (await first.fetch(quoteUrl(bhav))).json()).billing.kind, 'free');
  assert.equal((await (await second.fetch(quoteUrl(bhav))).json()).billing.kind, 'paid');
  // A different person still gets their own free answers.
  const other = buyerFor(newAgent({ human: 8004 }));
  assert.equal((await (await other.fetch(quoteUrl(bhav))).json()).billing.kind, 'free');
});

test('the buyer refuses to pay more than its cap, and nothing is settled', async () => {
  const bhav = await startBhav({ freePerDay: 0, priceAtomic: '50000' }); // $0.05
  const buyer = buyerFor(newAgent({ human: 8005 }), { maxPerPayment: 20000 }); // cap $0.02
  await assert.rejects(async () => { const r = await buyer.fetch(quoteUrl(bhav)); if (r.status !== 200) throw new Error(`status ${r.status}`); });
  assert.equal(bhav.facilitator.settled.length, 0);
  assert.equal(bhav.lookups.length, 0);
});

test('a forged payment (signed for the wrong payee) is rejected by the facilitator', async () => {
  const facilitator = fakeFacilitator();
  const bhav = await startBhav({ freePerDay: 0, facilitator });
  const agent = newAgent({ human: 8006 });
  const realVerify = facilitator.verify;
  // Tamper with the payload in flight: point the authorization at another wallet.
  facilitator.verify = (payload, req) => realVerify({ ...payload, payload: { ...payload.payload, authorization: { ...payload.payload.authorization, to: '0x000000000000000000000000000000000000dEaD' } } }, req);
  const res = await buyerFor(agent).fetch(quoteUrl(bhav));
  assert.equal(res.status, 402);
  assert.equal(facilitator.settled.length, 0);
  assert.equal(bhav.lookups.length, 0);
});

test('the free quota resets the next day and survives a restart', async () => {
  let clock = new Date('2026-12-01T10:00:00Z');
  const now = () => clock;
  const bhav = await startBhav({ freePerDay: 1, now });
  const buyer = buyerFor(newAgent({ human: 8007 }));
  assert.equal((await (await buyer.fetch(quoteUrl(bhav))).json()).billing.kind, 'free');
  bhav.close();

  // Restart on the same data dir: today's free answer is still used.
  const again = await startBhav({ freePerDay: 1, now, dataDir: bhav.dataDir });
  assert.equal((await (await buyer.fetch(quoteUrl(again))).json()).billing.kind, 'paid');

  clock = new Date('2026-12-02T00:05:00Z');
  assert.equal((await (await buyer.fetch(quoteUrl(again))).json()).billing.kind, 'free');
});

test('a failed price lookup returns 502 and does not use up a free answer', async () => {
  let fail = true;
  const bhav = await startBhav({ freePerDay: 1, quote: async (q) => { if (fail) throw new Error('all stores down'); return { q, answer: 'ok' }; } });
  const buyer = buyerFor(newAgent({ human: 8008 }));
  assert.equal((await buyer.fetch(quoteUrl(bhav))).status, 502);
  fail = false;
  assert.deepEqual((await (await buyer.fetch(quoteUrl(bhav))).json()).billing, { kind: 'free', freeLeftToday: 0 });
});

// ── Self disclosures ──────────────────────────────────────────────────────

test('the answer says whether the human is an adult and their country, and nothing else from the ID', async () => {
  const bhav = await startBhav();
  const adult = buyerFor(newAgent({ human: 8101, cred: { olderThan: 18, nationality: 'IND', name: ['ASHA', 'MENON'], idNumber: 'XXXX1234', dateOfBirth: '01-01-90' } }));
  const body = await (await adult.fetch(quoteUrl(bhav))).json();
  assert.deepEqual(body.agent.human, { adult: true, country: 'IND' });
  const minor = buyerFor(newAgent({ human: 8102, cred: { olderThan: 0, nationality: 'BRA' } }));
  assert.deepEqual((await (await minor.fetch(quoteUrl(bhav))).json()).agent.human, { adult: false, country: 'BRA' });
  const log = readFileSync(join(bhav.dataDir, 'events.jsonl'), 'utf8');
  for (const secret of ['ASHA', 'MENON', 'XXXX1234', '01-01-90']) assert.ok(!log.includes(secret), `${secret} must never be logged`);
  const s = await (await fetch(`${bhav.base}/v1/stats`)).json();
  assert.deepEqual(s.totals.humansByCountry, { IND: 1, BRA: 1 });
  assert.equal(s.totals.adultHumans, 1);
});

// ── Website lane and stats ──────────────────────────────────────────────────

test('the website demo is free, labelled, and rate-limited', async () => {
  const bhav = await startBhav({ demoGapMs: 60_000 });
  const first = await fetch(`${bhav.base}/v1/demo?q=eggs`);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).demo, true);
  const second = await fetch(`${bhav.base}/v1/demo?q=eggs`);
  assert.equal(second.status, 429);
});

test('stats count free, paid and refused answers and list settlements', async () => {
  const bhav = await startBhav({ freePerDay: 1 });
  const buyer = buyerFor(newAgent({ human: 8009 }));
  await buyer.fetch(quoteUrl(bhav));
  await buyer.fetch(quoteUrl(bhav));
  await fetch(quoteUrl(bhav)); // unsigned → refused
  await new Promise((r) => setTimeout(r, 50));
  const s = await (await fetch(`${bhav.base}/v1/stats`)).json();
  assert.equal(s.totals.free, 1);
  assert.equal(s.totals.paid, 1);
  assert.equal(s.totals.refused, 1);
  assert.equal(s.totals.humans, 1);
  assert.equal(s.totals.usdcEarned, 0.01);
  assert.equal(s.settlements[0].tx, bhav.facilitator.settled[0].tx);
});

test('the registry fake answers like the real one (sanity check of the test rig)', async () => {
  const agent = newAgent({ human: 9001 });
  const v = SelfAgentVerifier.create().network('mainnet').rpc(registry.url).build();
  const self = new SelfAgent({ privateKey: agent.key, network: 'mainnet' });
  const h = await self.signRequest('GET', '/x');
  const r = await v.verify({ signature: h['x-self-agent-signature'], timestamp: h['x-self-agent-timestamp'], method: 'GET', url: '/x', body: '' });
  assert.equal(r.valid, true, r.error);
  assert.equal(r.agentAddress, agent.address);
  assert.equal(r.nullifier, 9001n);
  assert.equal(SELF_PROVIDER.length, 42);
});
