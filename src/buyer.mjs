// A household agent that asks Bhav for grocery prices.
// Every request is signed with its Self Agent ID key (proves a human is behind it);
// when the human's free quota is used up, it pays Bhav's x402 price in USDC on Celo,
// within a hard per-payment cap.
//
// Usage: node src/buyer.mjs "chicken curry cut" [--url http://127.0.0.1:3420] [--no-self]
//   --no-self : send the request WITHOUT a Self Agent ID (to show Bhav refusing it)
// Env: BHAV_BUYER_ENV (default ~/.config/pi/bhav-buyer.env), X402_NETWORK=mainnet (default) | testnet
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { SelfAgent } from '@selfxyz/agent-sdk';
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';
import { getAddress } from 'viem';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const query = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--url')) || 'chicken curry cut';
const base = opt('--url', process.env.BHAV_URL || 'https://devbox.tail84790b.ts.net');

const envFile = process.env.BHAV_BUYER_ENV || `${homedir()}/.config/pi/bhav-buyer.env`;
const key = readFileSync(envFile, 'utf8').match(/^BUYER_PRIVATE_KEY=(.*)$/m)[1];
const NET = process.env.X402_NETWORK === 'testnet' ? 'testnet' : 'mainnet'; // Bhav runs on mainnet
const CAIP = NET === 'mainnet' ? 'eip155:42220' : 'eip155:11142220';
const USDC = getAddress(NET === 'mainnet' ? '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' : '0x01C5C0122039549AD1493B8220cABEdD739BC44E');
const RPC = NET === 'mainnet' ? 'https://forno.celo.org' : 'https://forno.celo-sepolia.celo-testnet.org';
const MAX_PER_PAYMENT = process.env.BHAV_BUYER_MAX || '20000'; // $0.02 hard cap per answer

// 1. Identity: Self Agent ID lives on Celo mainnet (real human proof).
const self = new SelfAgent({ privateKey: key, network: 'mainnet' });
// Sign every attempt fresh (the x402 retry is a new request with a new timestamp).
const signedFetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const method = (init.method || (typeof input === 'string' ? 'GET' : input.method) || 'GET').toUpperCase();
  const headers = new Headers(init.headers || (typeof input === 'string' ? undefined : input.headers));
  if (!flag('--no-self')) {
    for (const [k, v] of Object.entries(await self.signRequest(method, url))) headers.set(k, v);
  }
  return fetch(url, { ...init, method, headers });
};

// 2. Payment: x402 with a strict cap, USDC only.
const account = privateKeyToAccount(key);
const client = new x402Client();
client.setSpendControls({ allowedAssets: [{ network: CAIP, asset: USDC, maxAmountPerPayment: MAX_PER_PAYMENT }] });
client.register('eip155:*', new ExactEvmScheme(account, { rpcUrl: RPC }));
const payFetch = wrapFetchWithPayment(signedFetch, client);

const url = `${base}/v1/quote?q=${encodeURIComponent(query)}`;
const t0 = Date.now();
const res = await payFetch(url);
const body = await res.json().catch(() => ({}));
const receipt = res.headers.get('payment-response');
console.log(JSON.stringify({
  agent: account.address, selfAgent: !flag('--no-self'), status: res.status, ms: Date.now() - t0,
  answer: body.answer ?? body.message ?? body.error, billing: body.billing,
  settlement: receipt ? JSON.parse(Buffer.from(receipt, 'base64').toString()) : undefined,
}, null, 2));
if (args.includes('--full')) console.log(JSON.stringify(body, null, 2));
