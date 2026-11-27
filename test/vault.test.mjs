// The household agent's Agent Vault side, with Agent Vault itself faked. The fakes answer the way
// the live service answered on 28 Nov 2026 (docs/proof/agent-vault-cap-refusal.png): a payment
// over the agent card's per-payment cap is refused with `limit_reached` and nothing is paid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pay } from '../src/vault.mjs';
import { dealChatter, nearbyStores, extractPosts, BUY } from '../src/household.mjs';

process.env.AGENTVAULT_API_KEY ||= 'av_test_key';
const wallet = { card: 'av_wallet_test', name: 'Agent wallet', network: 'celo', tokens: ['USDC'] };
class VaultError extends Error { constructor(code, message, payment) { super(message); this.code = code; this.payment = payment; } }

/** A fake Agent Vault wallet governed by one agent card: per-payment cap + approved sellers. */
function fakeVault({ capUsd = 0.02, balanceUsd = 0.5, approved = new Set(), paused = false } = {}) {
  const calls = [];
  const payRequest = async (o) => {
    calls.push(o);
    const price = o.url === BUY.places.url ? 0.04 : 0.005;
    const key = o.idempotencyKey || 'av_k1';
    if (!o.card?.startsWith('av_wallet_')) throw new VaultError('invalid_card', 'not a wallet');
    if (price > Number(o.maxAmount)) throw new VaultError('price_over_max', 'The route costs more than maxAmount; nothing was paid.', { sent: false, idempotencyKey: key });
    if (price > balanceUsd) throw new VaultError('insufficient_balance', 'The wallet holds less than the price in USDC. Ask the owner to fund it; nothing was paid.', { sent: false, idempotencyKey: key });
    if (!approved.has(new URL(o.url).pathname)) return { ok: true, outcome: 'pending', idempotencyKey: key, message: 'Waiting on the owner to approve this payment.' };
    if (paused) throw new VaultError('card_paused', 'No agent card can pay right now.', { sent: false, idempotencyKey: key });
    if (price > capUsd) { paused = true; throw new VaultError('limit_reached', "That would pass the card's spending limit. Ask the owner to raise it; nothing was paid.", { sent: false, idempotencyKey: key }); }
    balanceUsd -= price;
    return { ok: true, outcome: 'paid', idempotencyKey: key, amount: String(price), token: 'USDC', txHash: '0xabc', httpStatus: 200, body: JSON.stringify({ data: { tweets: [{ legacy: { full_text: 'Chicken curry cut ₹99 on Zepto today, use code FRESH' } }, { text: 'Blinkit chicken offer ends tonight in Kochi' }] } }) };
  };
  const deps = { catalog: async () => ({ wallets: [wallet] }), payRequest };
  return { calls, deps, payWith: (o) => pay(o, deps) };
}

test('a cheap Buy service is paid from the Agent Vault wallet and its answer is read', async () => {
  const v = fakeVault({ approved: new Set([new URL(BUY.deals.url).pathname]) });
  const r = await dealChatter('chicken curry cut', { pay: v.payWith });
  assert.equal(r.paid, true);
  assert.equal(r.txHash, '0xabc');
  assert.deepEqual(r.posts, ['Chicken curry cut ₹99 on Zepto today, use code FRESH', 'Blinkit chicken offer ends tonight in Kochi']);
  assert.equal(v.calls[0].card, 'av_wallet_test');
  assert.equal(v.calls[0].maxAmount, '0.005', 'the agent never offers more than the list price');
});

test('a first payment to a new seller waits for the owner; nothing is paid', async () => {
  const v = fakeVault();
  const r = await dealChatter('eggs', { pay: v.payWith });
  assert.equal(r.paid, false);
  assert.equal(r.pending, true);
  assert.deepEqual(r.posts, []);
});

test('the agent card cap refuses a $0.04 payment, then the card stays paused', async () => {
  const v = fakeVault({ approved: new Set([new URL(BUY.places.url).pathname, new URL(BUY.deals.url).pathname]) });
  const r = await nearbyStores('Kochi', { pay: v.payWith });
  assert.equal(r.paid, false);
  assert.equal(r.refused, true);
  assert.equal(r.code, 'limit_reached');
  assert.match(r.message, /nothing was paid/);
  const after = await dealChatter('eggs', { pay: v.payWith });
  assert.equal(after.code, 'card_paused', 'auto-pause after the limit: even cheap payments stop until the owner resumes');
});

test('an empty wallet refuses before anything is sent', async () => {
  const v = fakeVault({ balanceUsd: 0, approved: new Set([new URL(BUY.deals.url).pathname]) });
  const r = await dealChatter('rice', { pay: v.payWith });
  assert.equal(r.code, 'insufficient_balance');
  assert.equal(r.payment.sent, false);
});

test('no wallet on the key: the owner is told what to do', async () => {
  const r = await pay({ url: BUY.deals.url, maxAmount: '0.005' }, { catalog: async () => ({ walletNote: 'No agent wallet is set up yet. Set it up on Wallet.' }) });
  assert.equal(r.code, 'no_wallet');
  assert.match(r.message, /Wallet/);
});

test('the agent never holds more than tokens: no card number, key or password crosses pay()', async () => {
  const v = fakeVault({ approved: new Set([new URL(BUY.deals.url).pathname]) });
  await dealChatter('milk', { pay: v.payWith });
  const sent = JSON.stringify(v.calls);
  assert.doesNotMatch(sent, /\b\d{13,19}\b/, 'no card number');
  assert.doesNotMatch(sent, /0x[0-9a-f]{64}/i, 'no private key');
});

test('post extraction copes with nested, duplicated and empty answers', () => {
  assert.deepEqual(extractPosts({}), []);
  assert.deepEqual(extractPosts([{ text: 'short' }]), []);
  assert.deepEqual(extractPosts({ a: [{ text: 'Zepto eggs 30 for ₹249 today' }, { text: 'Zepto eggs 30 for ₹249 today' }] }), ['Zepto eggs 30 for ₹249 today']);
});
