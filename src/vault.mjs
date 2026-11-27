// The household agent's Agent Vault side (https://agentvault.io, by Self Labs).
// The agent never holds a card number, a password or a wallet key: Agent Vault holds them,
// and every payment runs through the spending limits of the owner's agent card.
//   - pay():   pay a Buy service (x402, Celo mainnet) from the owner's Agent Vault wallet
//   - signIn(): sign in to a store with a login the owner saved in Agent Vault (src/vault-signin.mjs)
// Env: AGENTVAULT_API_KEY (or SELF_AGENT_PAY_API_KEY); optional SELF_AGENT_PAY_PROXY_URL / _API_URL.
import { listTokens, payRequest } from '@agentvault/playwright';

export const PROXY_URL = process.env.SELF_AGENT_PAY_PROXY_URL || 'wss://proxy.agentvault.io/v1';
export const API_URL = process.env.SELF_AGENT_PAY_API_URL || 'https://api.agentvault.io';

/** Map our env names onto the SDK's, once. */
export function vaultEnv(env = process.env) {
  const apiKey = env.SELF_AGENT_PAY_API_KEY || env.AGENTVAULT_API_KEY;
  if (!apiKey) throw new Error('AGENTVAULT_API_KEY missing');
  process.env.SELF_AGENT_PAY_API_KEY ||= apiKey;
  process.env.SELF_AGENT_PAY_PROXY_URL ||= PROXY_URL;
  process.env.SELF_AGENT_PAY_API_URL ||= API_URL;
  return { apiKey, proxyUrl: process.env.SELF_AGENT_PAY_PROXY_URL, apiUrl: process.env.SELF_AGENT_PAY_API_URL };
}

/** What this key may use: logins (by token, never the password) and the agent wallet. */
export async function catalog() {
  const { apiKey } = vaultEnv();
  return listTokens({ apiKey, baseUrl: API_URL });
}

/**
 * Pay a Buy route from the Agent Vault wallet. Never throws for a refusal: returns
 * { paid:false, refused:true, code, message } so the agent can tell its human what stopped it.
 * @param {object} o
 * @param {string} o.url        a https://gateway.usebuy.ai (or usebuy.ai/google/...) route
 * @param {string} o.maxAmount  the most the agent itself agrees to pay, USD, e.g. "0.01"
 * @param {'GET'|'POST'} [o.method] @param {object|string} [o.body] @param {string} [o.idempotencyKey]
 * @param {number} [o.waitSeconds] wait up to this long for the owner's approval in the Agent Vault app
 */
export async function pay(o) {
  const { apiKey } = vaultEnv();
  const cat = await catalog();
  const wallet = cat.wallets?.[0];
  if (!wallet) return { paid: false, refused: true, code: 'no_wallet', message: cat.walletNote || 'No Agent Vault wallet for this key.' };
  try {
    const r = await payRequest({
      card: wallet.card, url: o.url, method: o.method, body: o.body, maxAmount: o.maxAmount,
      idempotencyKey: o.idempotencyKey, apiKey, proxyUrl: process.env.SELF_AGENT_PAY_PROXY_URL,
      ...(o.waitSeconds ? { wait: { timeoutMs: o.waitSeconds * 1000 } } : {}),
    });
    return { paid: r.outcome === 'paid', pending: r.outcome === 'pending', ...r };
  } catch (e) {
    if (e?.code) return { paid: false, refused: true, code: e.code, message: e.message, idempotencyKey: e.payment?.idempotencyKey, payment: e.payment };
    throw e;
  }
}
