// A household agent that asks Bhav for grocery prices.
// Every request is signed with its Self Agent ID key (proves a human is behind it);
// when the human's free quota is used up, it pays Bhav's x402 price in USDC on Celo,
// within a hard per-payment cap. The client itself is src/agent.mjs.
//
// Usage: node src/buyer.mjs "chicken curry cut" [--url http://127.0.0.1:3420] [--no-self] [--full]
//   --no-self : send the request WITHOUT a Self Agent ID (to show Bhav refusing it)
// Env: BHAV_BUYER_ENV (default ~/.config/pi/bhav-buyer.env), X402_NETWORK=mainnet (default) | testnet,
//      BHAV_URL, BHAV_BUYER_MAX (USDC base units, default 20000 = $0.02)
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createBuyerFetch, readReceipt } from './agent.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const query = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--url')) || 'chicken curry cut';
const base = opt('--url', process.env.BHAV_URL || 'https://devbox.tail84790b.ts.net');

const envFile = process.env.BHAV_BUYER_ENV || `${homedir()}/.config/pi/bhav-buyer.env`;
const key = readFileSync(envFile, 'utf8').match(/^BUYER_PRIVATE_KEY=(.*)$/m)[1].trim();

const buyer = createBuyerFetch({
  privateKey: key,
  net: process.env.X402_NETWORK === 'testnet' ? 'testnet' : 'mainnet', // Bhav runs on mainnet
  withSelf: !flag('--no-self'),
  maxPerPayment: process.env.BHAV_BUYER_MAX || '20000',
});

const t0 = Date.now();
const res = await buyer.fetch(`${base}/v1/quote?q=${encodeURIComponent(query)}`);
const body = await res.json().catch(() => ({}));
console.log(JSON.stringify({
  agent: buyer.address, selfAgent: !flag('--no-self'), status: res.status, ms: Date.now() - t0,
  answer: body.answer ?? body.message ?? body.error, billing: body.billing,
  settlement: readReceipt(res),
}, null, 2));
if (flag('--full')) console.log(JSON.stringify(body, null, 2));
