// Bhav price service as an Express app, built from its parts so it can be tested.
// src/server.mjs wires the real parts (Self registry on Celo mainnet, Celo x402 facilitator,
// live store prices); test/ wires the same code to a local fake chain and facilitator.
//
// GET /v1/quote?q=<item>
//   1. Self Agent ID check (signed x-self-agent-* headers, verified against the Self registry).
//      No human behind the agent → 403, never served.
//   2. Free quota per HUMAN (the Self nullifier), not per agent: one person cannot multiply
//      their free quota by spinning up more agents.
//   3. Over the quota → x402: $0.01 USDC per answer, settled on Celo by the facilitator.
import express from 'express';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getAddress } from 'viem';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';

export const NETWORKS = {
  mainnet: { caip: 'eip155:42220', usdc: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', facilitator: 'https://api.x402.celo.org', explorer: 'https://celoscan.io' },
  testnet: { caip: 'eip155:11142220', usdc: '0x01C5C0122039549AD1493B8220cABEdD739BC44E', facilitator: 'https://api.x402.sepolia.celo.org', explorer: 'https://celo-sepolia.blockscout.com' },
};

/**
 * @param {object} o
 * @param {'mainnet'|'testnet'} o.net
 * @param {string} o.payTo            address that receives USDC
 * @param {object} o.verifier         SelfAgentVerifier (or anything with the same verify())
 * @param {object} o.facilitator      x402 FacilitatorClient (verify / settle / getSupported)
 * @param {(q:string)=>Promise<object>} o.quote  price lookup
 * @param {string} o.dataDir          where quota.json and events.jsonl live
 * @param {string} [o.priceAtomic]    USDC base units per paid answer (default 10000 = $0.01)
 * @param {number} [o.freePerDay]     free answers per human per day (default 3)
 * @param {number} [o.demoGapMs] [o.demoPerDay]  website demo lane limits
 * @param {()=>Date} [o.now]          clock (tests move it across midnight)
 */
export function createApp(o) {
  const NET = o.net === 'mainnet' ? 'mainnet' : 'testnet';
  const X402 = NETWORKS[NET];
  const PAY_TO = getAddress(o.payTo);
  const PRICE_ATOMIC = String(o.priceAtomic ?? '10000');
  const FREE_PER_DAY = Number(o.freePerDay ?? 3);
  const DATA = o.dataDir;
  const now = o.now ?? (() => new Date());
  mkdirSync(DATA, { recursive: true });

  const log = (event) => appendFileSync(join(DATA, 'events.jsonl'), JSON.stringify({ ts: now().toISOString(), net: NET, ...event }) + '\n');

  // Who caused a refusal: the website's "try it" button, our own health check, or a real caller.
  const viaOf = (req) => (req.headers['x-bhav-check'] === 'smoke' ? 'smoke' : req.headers.origin ? 'browser' : 'api');

  // ── Self Agent ID gate ──────────────────────────────────────────────────────
  async function selfGate(req, res, next) {
    const h = req.headers;
    if (!h['x-self-agent-signature'] || !h['x-self-agent-timestamp']) {
      log({ kind: 'refused', reason: 'no_self_agent_id', path: req.path, via: viaOf(req) });
      return res.status(403).json({
        error: 'human_backed_agents_only',
        message: 'Bhav only serves AI agents that have a real, unique human behind them. Register your agent with Self Agent ID (zero-knowledge, no personal data shared), then sign your requests.',
        how: 'https://docs.self.xyz/docs/agent-id/overview/',
      });
    }
    let r;
    try {
      r = await o.verifier.verify({
        signature: h['x-self-agent-signature'], timestamp: h['x-self-agent-timestamp'],
        method: req.method, url: req.originalUrl, body: '',
        keytype: h['x-self-agent-keytype'], agentKey: h['x-self-agent-key'],
      });
    } catch (e) {
      return res.status(503).json({ error: 'self_registry_unreachable', message: String(e.message || e) });
    }
    if (!r.valid) {
      log({ kind: 'refused', reason: r.error, agent: r.agentAddress, path: req.path, via: viaOf(req) });
      const status = r.retryAfterMs ? 429 : 403;
      return res.status(status).json({ error: 'not_a_verified_human_backed_agent', reason: r.error, retryAfterMs: r.retryAfterMs });
    }
    req.agent = { address: r.agentAddress, agentId: r.agentId.toString(), human: r.nullifier.toString(), agentsOfHuman: r.agentCount.toString() };
    next();
  }

  // ── Free quota per human per day (persisted, survives restarts) ─────────────
  const QUOTA_FILE = join(DATA, 'quota.json');
  const quota = existsSync(QUOTA_FILE) ? JSON.parse(readFileSync(QUOTA_FILE, 'utf8')) : {};
  const today = () => now().toISOString().slice(0, 10);
  const used = (human) => (quota[today()]?.[human] ?? 0);
  function spendFree(human) {
    const d = (quota[today()] ||= {});
    d[human] = (d[human] ?? 0) + 1;
    for (const k of Object.keys(quota)) if (k < today()) delete quota[k];
    writeFileSync(QUOTA_FILE, JSON.stringify(quota));
  }

  // ── x402 (only reached when the human's free quota is used up) ──────────────
  const resourceServer = new x402ResourceServer(o.facilitator);
  resourceServer.register('eip155:*', new ExactEvmScheme());
  const paid = paymentMiddleware({
    'GET /v1/quote': {
      accepts: [{
        scheme: 'exact', network: X402.caip, payTo: PAY_TO,
        price: { amount: PRICE_ATOMIC, asset: getAddress(X402.usdc), extra: { name: 'USDC', version: '2' } },
      }],
      description: 'Cheapest live grocery price in Kochi (Zepto, Blinkit, Instamart) with a deal check against price history',
      mimeType: 'application/json',
    },
  }, resourceServer);

  const app = express();
  app.get('/health', (_req, res) => res.json({ ok: true, network: NET, payTo: PAY_TO, freePerDay: FREE_PER_DAY, price: `$${Number(PRICE_ATOMIC) / 1e6} USDC` }));

  // Anyone (and any browser) may read stats, try the demo, or watch a refusal happen.
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'payment-required, payment-response');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  const short = (t, n = 220) => (t && t.length > n ? t.slice(0, n - 1) + '…' : t);
  function settlementOf(res) {
    const h = res.getHeader('payment-response');
    if (!h) return undefined;
    try { const j = JSON.parse(Buffer.from(String(h), 'base64').toString()); return { tx: j.transaction, payer: j.payer, network: j.network, ok: j.success }; }
    catch { return undefined; }
  }

  app.get('/v1/quote', selfGate, (req, res, next) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'missing_q', example: '/v1/quote?q=chicken%20curry%20cut' });
    if (used(req.agent.human) < FREE_PER_DAY) { req.bhavFree = true; return next(); }
    return paid(req, res, next);
  }, async (req, res) => {
    const q = String(req.query.q).trim();
    try {
      const answer = await o.quote(q);
      if (req.bhavFree) spendFree(req.agent.human);
      const base = { q, answer: short(answer.answer), agent: req.agent.address, agentId: req.agent.agentId, human: req.agent.human.slice(0, 12) };
      if (req.bhavFree) log({ kind: 'free', ...base });
      // x402 settles after the handler; read the receipt once the response is out.
      else res.on('finish', () => log({ kind: 'paid', ...base, usdc: Number(PRICE_ATOMIC) / 1e6, settlement: settlementOf(res) }));
      res.json({
        ...answer,
        billing: req.bhavFree
          ? { kind: 'free', freeLeftToday: FREE_PER_DAY - used(req.agent.human) }
          : { kind: 'paid', price: `$${Number(PRICE_ATOMIC) / 1e6} USDC`, network: X402.caip },
        agent: { address: req.agent.address, selfAgentId: req.agent.agentId },
      });
    } catch (e) {
      res.status(502).json({ error: 'price_lookup_failed', message: String(e.message || e) });
    }
  });

  // ── Website demo: lets a person try the product without an agent. Free, slow lane,
  // globally rate-limited, never billed, clearly labelled. Agents must use /v1/quote.
  const DEMO_GAP_MS = Number(o.demoGapMs ?? 12000);
  const DEMO_PER_DAY = Number(o.demoPerDay ?? 120);
  let demoLast = 0; const demoDay = { day: '', n: 0 };
  app.get('/v1/demo', async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (!q) return res.status(400).json({ error: 'missing_q' });
    if (demoDay.day !== today()) Object.assign(demoDay, { day: today(), n: 0 });
    const wait = demoLast + DEMO_GAP_MS - now().getTime();
    if (wait > 0 || demoDay.n >= DEMO_PER_DAY) {
      return res.status(429).json({ error: 'demo_busy', retryAfterMs: Math.max(wait, 0), message: 'The website demo is rate-limited. Agents get the full service at /v1/quote.' });
    }
    demoLast = now().getTime(); demoDay.n++;
    try {
      const a = await o.quote(q);
      log({ kind: 'demo', q, answer: short(a.answer) });
      res.json({ demo: true, note: `Website demo: free and rate-limited. Agents use /v1/quote with a Self Agent ID; after ${FREE_PER_DAY} free answers per human per day they pay $${Number(PRICE_ATOMIC) / 1e6} USDC over x402.`, ...a, offers: (a.offers || []).slice(0, 6) });
    } catch (e) {
      res.status(502).json({ error: 'price_lookup_failed', message: String(e.message || e) });
    }
  });

  // ── Live stats for the website and for judges ──────────────────────────────
  app.get('/v1/stats', (_req, res) => {
    const file = join(DATA, 'events.jsonl');
    const ev = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((e) => e && e.net === NET) : [];
    const count = (k) => ev.filter((e) => e.kind === k).length;
    const paidEv = ev.filter((e) => e.kind === 'paid');
    const served = ev.filter((e) => e.kind === 'free' || e.kind === 'paid');
    res.json({
      network: X402.caip, explorer: X402.explorer, payTo: PAY_TO, price: `$${Number(PRICE_ATOMIC) / 1e6} USDC`, freePerHumanPerDay: FREE_PER_DAY,
      since: ev[0]?.ts,
      totals: {
        agentAnswers: served.length, free: count('free'), paid: paidEv.length, refused: ev.filter((e) => e.kind === 'refused' && (e.via ?? 'api') === 'api').length,
        refusedFromWebsiteButton: ev.filter((e) => e.kind === 'refused' && e.via === 'browser').length, demo: count('demo'),
        humans: new Set(served.map((e) => e.human)).size, agents: new Set(served.map((e) => e.agent)).size,
        usdcEarned: +(paidEv.reduce((s, e) => s + (e.usdc ?? Number(PRICE_ATOMIC) / 1e6), 0)).toFixed(6),
      },
      settlements: paidEv.filter((e) => e.settlement?.tx).slice(-10).reverse().map((e) => ({ ts: e.ts, tx: e.settlement.tx, payer: e.settlement.payer, q: e.q })),
      recent: ev.filter((e) => e.kind !== 'demo' && (e.via ?? 'api') === 'api').slice(-15).reverse().map((e) => ({
        ts: e.ts, kind: e.kind, q: e.q, answer: e.answer, agentId: e.agentId, agent: e.agent && `${e.agent.slice(0, 6)}…${e.agent.slice(-4)}`,
        reason: e.reason, tx: e.settlement?.tx,
      })),
    });
  });

  return app;
}
