// The household buyer agent's HTTP client, shared by src/buyer.mjs and the tests.
// Every request is signed with the agent's Self Agent ID key (proves a human is behind it);
// when Bhav answers 402, it pays the x402 price in USDC on Celo, but never more than its cap
// and never in any other asset or network.
import { SelfAgent } from '@selfxyz/agent-sdk';
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';
import { getAddress } from 'viem';
import { NETWORKS } from './app.mjs';

const RPC = { mainnet: 'https://forno.celo.org', testnet: 'https://forno.celo-sepolia.celo-testnet.org' };

/**
 * @param {object} o
 * @param {`0x${string}`} o.privateKey   the agent's key (also its Self Agent ID key)
 * @param {'mainnet'|'testnet'} [o.net]  payment network (default mainnet)
 * @param {boolean} [o.withSelf]        sign requests with Self Agent ID (default true; false = show the refusal)
 * @param {string|number} [o.maxPerPayment]  hard cap per answer in USDC base units (default 20000 = $0.02)
 * @param {object} [o.selfOptions]      extra SelfAgent options (tests point it at a local registry)
 * @param {string} [o.rpcUrl]           RPC for the payment scheme
 * @param {typeof fetch} [o.fetchImpl]
 */
export function createBuyerFetch(o) {
  const net = o.net === 'testnet' ? 'testnet' : 'mainnet';
  const caip = NETWORKS[net].caip;
  const usdc = getAddress(NETWORKS[net].usdc);
  const baseFetch = o.fetchImpl ?? fetch;
  const withSelf = o.withSelf !== false;

  // 1. Identity: Self Agent ID lives on Celo mainnet (real human proof).
  const self = new SelfAgent({ privateKey: o.privateKey, network: 'mainnet', ...o.selfOptions });
  // Sign every attempt fresh (the x402 retry is a new request with a new timestamp).
  const signedFetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init.method || (typeof input === 'string' ? 'GET' : input.method) || 'GET').toUpperCase();
    const headers = new Headers(init.headers || (typeof input === 'string' ? undefined : input.headers));
    if (withSelf) for (const [k, v] of Object.entries(await self.signRequest(method, url))) headers.set(k, v);
    return baseFetch(url, { ...init, method, headers });
  };

  // 2. Payment: x402, USDC on one network only, with a strict cap.
  const account = privateKeyToAccount(o.privateKey);
  const client = new x402Client();
  client.setSpendControls({ allowedAssets: [{ network: caip, asset: usdc, maxAmountPerPayment: String(o.maxPerPayment ?? 20000) }] });
  client.register('eip155:*', new ExactEvmScheme(account, { rpcUrl: o.rpcUrl ?? RPC[net] }));
  return { fetch: wrapFetchWithPayment(signedFetch, client), address: account.address };
}

/** Decode the base64 `payment-response` header x402 returns after settlement. */
export function readReceipt(res) {
  const h = res.headers.get('payment-response');
  return h ? JSON.parse(Buffer.from(h, 'base64').toString()) : undefined;
}
