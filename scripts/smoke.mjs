// Read-only check of the LIVE Bhav API on Celo mainnet. Free: it never pays and never signs.
//   npm run test:live            (or BHAV_URL=http://127.0.0.1:3420 npm run test:live)
// Checks: health is up on mainnet, an agent with no Self Agent ID is refused (403), stats are
// served, and every settlement listed in stats is a successful USDC transfer to Bhav on Celo.
import assert from 'node:assert/strict';
import { createPublicClient, http, fallback, getAddress, parseAbiItem, decodeEventLog } from 'viem';
import { celo } from 'viem/chains';

const base = process.env.BHAV_URL || 'https://devbox.tail84790b.ts.net';
const ok = (m) => console.log(`✔ ${m}`);

const health = await (await fetch(`${base}/health`)).json();
assert.equal(health.ok, true); assert.equal(health.network, 'mainnet');
ok(`health: mainnet, payTo ${health.payTo}, ${health.price}, ${health.freePerDay} free/human/day`);

const refused = await fetch(`${base}/v1/quote?q=eggs`, { headers: { 'x-bhav-check': 'smoke' } }); // not counted in stats
assert.equal(refused.status, 403);
assert.equal((await refused.json()).error, 'human_backed_agents_only');
ok('an agent with no Self Agent ID is refused (403)');

const stats = await (await fetch(`${base}/v1/stats`)).json();
assert.equal(stats.network, 'eip155:42220');
ok(`stats: ${stats.totals.agentAnswers} agent answers (${stats.totals.free} free, ${stats.totals.paid} paid), ${stats.totals.refused} refused, ${stats.totals.humans} humans`);

// Public Celo RPCs drop requests now and then: retry, and fall back to a second one.
const chain = createPublicClient({ chain: celo, transport: fallback([http('https://forno.celo.org', { retryCount: 4 }), http('https://celo.drpc.org', { retryCount: 4 })]) });
const transfer = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
const USDC = getAddress('0xcebA9300f2b948710d2653dD7B07f33A8B32118C');
for (const s of stats.settlements) {
  const r = await chain.waitForTransactionReceipt({ hash: s.tx, timeout: 30_000 });
  assert.equal(r.status, 'success');
  const paid = r.logs.filter((l) => getAddress(l.address) === USDC).flatMap((l) => { try { return [decodeEventLog({ abi: [transfer], ...l }).args]; } catch { return []; } }) // skip AuthorizationUsed etc.
    .find((a) => getAddress(a.to) === getAddress(health.payTo));
  assert.ok(paid, `no USDC transfer to Bhav in ${s.tx}`);
  ok(`settlement ${s.tx.slice(0, 10)}…: ${Number(paid.value) / 1e6} USDC from ${paid.from.slice(0, 8)}… to Bhav, confirmed on Celo`);
}
console.log('live check passed');
