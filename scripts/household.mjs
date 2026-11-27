// The household agent's whole job, end to end, as filmed for the demo:
//   1. Self Agent ID: it proves a real human is behind it and asks Bhav for the cheapest price
//      (free answers first, then $0.01 USDC over x402 on Celo).
//   2. Agent Vault sign-in: it signs in to instacart.com with a login Agent Vault opened for it (a
//      vault-minted password nobody sees); any captcha or email code is handed to the owner's phone.
//   3. Agent Vault wallet: it pays $0.04 on Buy (Google Places) for open supermarkets nearby, from the
//      owner's Agent Vault wallet, under the agent card's weekly grocery-research budget.
//   4. Agent Vault limit: it keeps looking up; when the $0.10 weekly budget would be passed, Agent Vault
//      refuses (nothing paid) and pauses the card until the owner resumes it.
// Usage: node scripts/household.mjs "chicken curry cut" [--skip self,signin,stores,limit]
// Env: AGENTVAULT_API_KEY (~/.config/pi/bhav.env), BHAV_BUYER_ENV (Self Agent ID key), BHAV_URL.
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBuyerFetch, readReceipt } from '../src/agent.mjs';
import { signInToInstacart } from '../src/vault-instacart.mjs';
import { nearbyStores } from '../src/household.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const item = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--skip') || 'chicken curry cut';
const skip = new Set((args.includes('--skip') ? args[args.indexOf('--skip') + 1] : '').split(',').filter(Boolean));
const base = process.env.BHAV_URL || 'https://devbox.tail84790b.ts.net';

for (const f of [`${homedir()}/.config/pi/bhav.env`]) {
  try { for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^(AGENTVAULT_API_KEY)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); } } catch {}
}
mkdirSync(join(ROOT, '.data'), { recursive: true });
const record = (step, detail = {}) => {
  appendFileSync(join(ROOT, '.data', 'household.jsonl'), JSON.stringify({ ts: new Date().toISOString(), item, step, ...detail }) + '\n');
};
const say = (n, text) => console.log(`\n[${n}] ${text}`);
const results = {};

if (!skip.has('self')) {
  say(1, `Asking Bhav for "${item}" as Self Agent ID #212 (human-backed)…`);
  const key = readFileSync(process.env.BHAV_BUYER_ENV || `${homedir()}/.config/pi/bhav-buyer.env`, 'utf8').match(/^BUYER_PRIVATE_KEY=(.*)$/m)[1].trim();
  const buyer = createBuyerFetch({ privateKey: key, net: 'mainnet' });
  const res = await buyer.fetch(`${base}/v1/quote?q=${encodeURIComponent(item)}`);
  const body = await res.json().catch(() => ({}));
  const receipt = readReceipt(res);
  results.self = { status: res.status, answer: body.answer, billing: body.billing, tx: receipt?.transaction };
  console.log(`    ${res.status} · ${body.answer ?? body.error}`);
  console.log(`    billing: ${JSON.stringify(body.billing)}${receipt?.transaction ? ` · x402 tx ${receipt.transaction}` : ''}`);
  record('self_agent_id_quote', results.self);
}

if (!skip.has('signin')) {
  say(2, 'Signing in to instacart.com through Agent Vault (the agent only holds tokens)…');
  const r = await signInToInstacart({ log: (step, d) => { console.log(`    · ${step}${d ? ' ' + JSON.stringify(d) : ''}`); record('instacart_' + step, d); } });
  results.signin = r;
  console.log(`    → ${r.signedIn ? 'signed in' : `not signed in (${r.step})`}${r.message ? ': ' + r.message : ''}`);
}

if (!skip.has('stores')) {
  say(3, 'Paying $0.04 on Buy (Google Places) from the Agent Vault wallet: open supermarkets nearby…');
  const r = await nearbyStores(process.env.BHAV_AREA || 'Kakkanad, Kochi', { waitSeconds: 120 });
  results.stores = { paid: r.paid, code: r.code, message: r.message, amount: r.amount, tx: r.txHash, stores: r.stores };
  console.log(r.paid ? `    paid ${r.amount} ${r.token} · tx ${r.txHash}` : `    not paid: ${r.code || ''} ${r.message || ''}`);
  for (const st of r.stores || []) console.log(`      ${st.openNow ? 'open  ' : 'closed'} ${st.name} (${st.rating ?? '-'}) · ${st.address}`);
  record('agent_vault_buy_payment', results.stores);
}

if (!skip.has('limit')) {
  say(4, 'Looking up again until the weekly grocery-research budget ($0.10) runs out…');
  for (let i = 1; i <= 3; i++) {
    const r = await nearbyStores('Edappally, Kochi');
    if (r.paid) { console.log(`    lookup ${i}: paid ${r.amount} USDC · tx ${r.txHash}`); continue; }
    results.limit = { lookup: i, refused: r.refused, code: r.code, message: r.message };
    console.log(r.refused ? `    lookup ${i}: refused by Agent Vault: ${r.code} · ${r.message}` : `    lookup ${i}: ${r.pending ? 'waiting for the owner' : 'not paid'}`);
    break;
  }
  record('agent_vault_limit', results.limit ?? { refused: false });
}

console.log('\n' + JSON.stringify(results, null, 1).slice(0, 3000));
