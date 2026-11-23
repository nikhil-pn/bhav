// Bhav price service: grocery prices for agents that have a real human behind them.
//
// GET /v1/quote?q=<item>
//   1. Self Agent ID check (signed x-self-agent-* headers, verified against the Self
//      registry on Celo mainnet). No human behind the agent → 403, never served.
//   2. Free quota per HUMAN (the Self nullifier), not per agent: one person cannot
//      multiply their free quota by spinning up more agents.
//   3. Over the quota → x402: $0.01 USDC per answer, settled on Celo by the facilitator.
//
// Env: X402_API_KEY, X402_NETWORK=testnet|mainnet, BHAV_PAY_TO, PORT, BHAV_FREE_PER_DAY.
import express from 'express';
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAddress } from 'viem';
import { SelfAgentVerifier } from '@selfxyz/agent-sdk';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.BHAV_DATA_DIR || join(ROOT, '.data');
mkdirSync(DATA, { recursive: true });

const NET = process.env.X402_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
const X402 = {
  mainnet: { caip: 'eip155:42220', usdc: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', facilitator: 'https://api.x402.celo.org', explorer: 'https://celoscan.io' },
  testnet: { caip: 'eip155:11142220', usdc: '0x01C5C0122039549AD1493B8220cABEdD739BC44E', facilitator: 'https://api.x402.sepolia.celo.org', explorer: 'https://celo-sepolia.blockscout.com' },
}[NET];
const PRICE_ATOMIC = process.env.BHAV_PRICE_ATOMIC || '10000'; // $0.01 in USDC (6 decimals)
const FREE_PER_DAY = Number(process.env.BHAV_FREE_PER_DAY || 3);
const PAY_TO = getAddress(process.env.BHAV_PAY_TO);
if (!process.env.X402_API_KEY) throw new Error('X402_API_KEY missing');

// ── Self Agent ID ─────────────────────────────────────────────────────────────
// Humans are proven on Celo MAINNET (real passports / Aadhaar) even while payments are
// tested on Sepolia. sybilLimit(10) = the registry's own per-human cap; we still get the
// nullifier, which is what the quota is keyed on.
const verifier = SelfAgentVerifier.create().network('mainnet').sybilLimit(10).build();

async function selfGate(req, res, next) {
  const h = req.headers;
  if (!h['x-self-agent-signature'] || !h['x-self-agent-timestamp']) {
    log({ kind: 'refused', reason: 'no_self_agent_id', path: req.path });
    return res.status(403).json({
      error: 'human_backed_agents_only',
      message: 'Bhav only serves AI agents that have a real, unique human behind them. Register your agent with Self Agent ID (zero-knowledge, no personal data shared), then sign your requests.',
      how: 'https://docs.self.xyz/docs/agent-id/overview/',
    });
  }
  let r;
  try {
    r = await verifier.verify({
      signature: h['x-self-agent-signature'], timestamp: h['x-self-agent-timestamp'],
      method: req.method, url: req.originalUrl, body: '',
      keytype: h['x-self-agent-keytype'], agentKey: h['x-self-agent-key'],
    });
  } catch (e) {
    return res.status(503).json({ error: 'self_registry_unreachable', message: String(e.message || e) });
  }
  if (!r.valid) {
    log({ kind: 'refused', reason: r.error, agent: r.agentAddress, path: req.path });
    const status = r.retryAfterMs ? 429 : 403;
    return res.status(status).json({ error: 'not_a_verified_human_backed_agent', reason: r.error, retryAfterMs: r.retryAfterMs });
  }
  req.agent = { address: r.agentAddress, agentId: r.agentId.toString(), human: r.nullifier.toString(), agentsOfHuman: r.agentCount.toString() };
  next();
}

// ── Free quota per human per day (persisted, survives restarts) ───────────────
const QUOTA_FILE = join(DATA, 'quota.json');
const quota = existsSync(QUOTA_FILE) ? JSON.parse(readFileSync(QUOTA_FILE, 'utf8')) : {};
const today = () => new Date().toISOString().slice(0, 10);
const used = (human) => (quota[today()]?.[human] ?? 0);
function spendFree(human) {
  const d = (quota[today()] ||= {});
  d[human] = (d[human] ?? 0) + 1;
  for (const k of Object.keys(quota)) if (k < today()) delete quota[k];
  import('node:fs').then((fs) => fs.writeFileSync(QUOTA_FILE, JSON.stringify(quota)));
}

function log(event) {
  appendFileSync(join(DATA, 'events.jsonl'), JSON.stringify({ ts: new Date().toISOString(), net: NET, ...event }) + '\n');
}

// ── x402 (only reached when the human's free quota is used up) ────────────────
const facilitator = new HTTPFacilitatorClient({
  url: X402.facilitator,
  createAuthHeaders: async () => {
    const h = { 'X-API-Key': process.env.X402_API_KEY };
    return { verify: h, settle: h, supported: h };
  },
});
const resourceServer = new x402ResourceServer(facilitator);
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

// ── App ───────────────────────────────────────────────────────────────────────
let pricesMod;
async function quote(q) {
  pricesMod ||= await import(process.env.BHAV_PRICES_MODULE || './prices/index.mjs');
  return pricesMod.quote(q);
}

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
    const answer = await quote(q);
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
const DEMO_GAP_MS = Number(process.env.BHAV_DEMO_GAP_MS || 12000);
const DEMO_PER_DAY = Number(process.env.BHAV_DEMO_PER_DAY || 120);
let demoLast = 0; const demoDay = { day: '', n: 0 };
app.get('/v1/demo', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (!q) return res.status(400).json({ error: 'missing_q' });
  if (demoDay.day !== today()) Object.assign(demoDay, { day: today(), n: 0 });
  const wait = demoLast + DEMO_GAP_MS - Date.now();
  if (wait > 0 || demoDay.n >= DEMO_PER_DAY) {
    return res.status(429).json({ error: 'demo_busy', retryAfterMs: Math.max(wait, 0), message: 'The website demo is rate-limited. Agents get the full service at /v1/quote.' });
  }
  demoLast = Date.now(); demoDay.n++;
  try {
    const a = await quote(q);
    log({ kind: 'demo', q, answer: short(a.answer) });
    res.json({ demo: true, note: 'Website demo: free and rate-limited. Agents use /v1/quote with a Self Agent ID; after 3 free answers per human per day they pay $0.01 USDC over x402.', ...a, offers: (a.offers || []).slice(0, 6) });
  } catch (e) {
    res.status(502).json({ error: 'price_lookup_failed', message: String(e.message || e) });
  }
});

// ── Live stats for the website and for judges ────────────────────────────────
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
      agentAnswers: served.length, free: count('free'), paid: paidEv.length, refused: count('refused'), demo: count('demo'),
      humans: new Set(served.map((e) => e.human)).size, agents: new Set(served.map((e) => e.agent)).size,
      usdcEarned: +(paidEv.reduce((s, e) => s + (e.usdc ?? Number(PRICE_ATOMIC) / 1e6), 0)).toFixed(6),
    },
    settlements: paidEv.filter((e) => e.settlement?.tx).slice(-10).reverse().map((e) => ({ ts: e.ts, tx: e.settlement.tx, payer: e.settlement.payer, q: e.q })),
    recent: ev.filter((e) => e.kind !== 'demo').slice(-15).reverse().map((e) => ({
      ts: e.ts, kind: e.kind, q: e.q, answer: e.answer, agentId: e.agentId, agent: e.agent && `${e.agent.slice(0, 6)}…${e.agent.slice(-4)}`,
      reason: e.reason, tx: e.settlement?.tx,
    })),
  });
});

const port = Number(process.env.PORT || 3420);
app.listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log(`bhav on :${port} · x402 ${NET} (${X402.caip}) · payTo ${PAY_TO} · ${FREE_PER_DAY} free/human/day`);
});
