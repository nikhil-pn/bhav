// The household agent's whole job, end to end, as filmed for the demo:
//   1. Self Agent ID: it proves a real human is behind it and asks Bhav for the cheapest price
//      (free answers first, then $0.01 USDC over x402 on Celo).
//   2. Agent Vault sign-in: it signs in to amazon.in with the owner's saved login; it never sees
//      the password, and Amazon's one-time code goes to the owner's phone.
//   3. Agent Vault wallet: it pays a Buy service ($0.005, recent Reddit posts on the item's price) under the agent card.
//   4. Agent Vault limit: it tries a $0.04 Buy service; the $0.02 per-payment cap refuses it.
// Usage: node scripts/household.mjs "chicken curry cut" [--skip self,signin,deals,limit]
// Env: AGENTVAULT_API_KEY (~/.config/pi/bhav.env), BHAV_BUYER_ENV (Self Agent ID key), BHAV_URL.
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBuyerFetch, readReceipt } from '../src/agent.mjs';
import { signInToAmazon } from '../src/vault-signin.mjs';
import { dealChatter, nearbyStores } from '../src/household.mjs';

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
  say(2, 'Signing in to amazon.in through Agent Vault (the agent only holds tokens)…');
  const r = await signInToAmazon({ log: (step, d) => { console.log(`    · ${step}${d ? ' ' + JSON.stringify(d) : ''}`); record('amazon_' + step, d); } });
  results.signin = r;
  console.log(`    → ${r.signedIn ? 'signed in' : `not signed in (${r.step})`}${r.message ? ': ' + r.message : ''}`);
}

if (!skip.has('deals')) {
  say(3, `Paying $0.005 on Buy from the Agent Vault wallet for recent Reddit posts about "${item}" prices…`);
  const r = await dealChatter(item, { waitSeconds: 120 });
  results.deals = { paid: r.paid, pending: r.pending, code: r.code, message: r.message, amount: r.amount, tx: r.txHash, posts: r.posts };
  console.log(r.paid ? `    paid ${r.amount} ${r.token} · tx ${r.txHash} · ${r.posts.length} posts` : `    not paid: ${r.code || (r.pending ? 'waiting for the owner' : '')} ${r.message || ''}`);
  for (const p of r.posts || []) console.log(`      “${p}”`);
  record('agent_vault_buy_payment', results.deals);
}

if (!skip.has('limit')) {
  say(4, 'Trying a $0.04 Buy service (nearby supermarkets): the agent card allows $0.02 per payment…');
  const r = await nearbyStores('Kochi');
  results.limit = { paid: r.paid, refused: r.refused, code: r.code, message: r.message };
  console.log(r.refused ? `    refused by Agent Vault: ${r.code} · ${r.message}` : `    ${r.paid ? 'PAID (cap did not hold!)' : r.pending ? 'waiting for the owner' : 'not paid'}`);
  record('agent_vault_limit', results.limit);
}

console.log('\n' + JSON.stringify(results, null, 1).slice(0, 3000));
