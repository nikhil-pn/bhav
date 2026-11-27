// The household agent's Agent Vault side, with Agent Vault itself faked. The fakes answer the way
// the live service answered on 28 Nov 2026: a Places lookup paid from the wallet, a payment that would
// pass the agent card's limit refused with `limit_reached` (nothing paid), then the card paused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pay } from '../src/vault.mjs';
import { nearbyStores, parseStores, BUY } from '../src/household.mjs';

process.env.AGENTVAULT_API_KEY ||= 'av_test_key';
const wallet = { card: 'av_wallet_test', name: 'Agent wallet', network: 'celo', tokens: ['USDC'] };
class VaultError extends Error { constructor(code, message, payment) { super(message); this.code = code; this.payment = payment; } }

const PLACES = {
  places: [
    { displayName: { text: 'We Mart Hyper Market' }, formattedAddress: 'Infopark Rd, Kakkanad', rating: 4.2, currentOpeningHours: { openNow: false } },
    { displayName: { text: 'Finemart Supermarket' }, formattedAddress: 'Lavanya Nagar Rd, Kakkanad', rating: 4, currentOpeningHours: { openNow: true } },
  ],
};

/** A fake Agent Vault wallet governed by one agent card: per-payment cap, weekly budget, approved sellers. */
function fakeVault({ perPayment = 0.05, weekly = 0.10, spent = 0, balanceUsd = 0.5, approved = true } = {}) {
  const calls = [];
  let paused = false;
  const payRequest = async (o) => {
    calls.push(o);
    const price = 0.04;
    const key = o.idempotencyKey || `av_k${calls.length}`;
    if (price > Number(o.maxAmount)) throw new VaultError('price_over_max', 'The route costs more than maxAmount; nothing was paid.', { sent: false, idempotencyKey: key });
    if (price > balanceUsd) throw new VaultError('insufficient_balance', 'The wallet holds less than the price in USDC. Ask the owner to fund it; nothing was paid.', { sent: false, idempotencyKey: key });
    if (!approved) return { ok: true, outcome: 'pending', idempotencyKey: key, message: 'Waiting on the owner to approve this payment.' };
    if (paused) throw new VaultError('card_paused', 'No agent card can pay right now.', { sent: false, idempotencyKey: key });
    if (price > perPayment || spent + price > weekly + 1e-9) { paused = true; throw new VaultError('limit_reached', "That would pass the card's spending limit. Ask the owner to raise it; nothing was paid.", { sent: false, idempotencyKey: key }); }
    spent += price; balanceUsd -= price;
    return { ok: true, outcome: 'paid', idempotencyKey: key, amount: String(price), token: 'USDC', txHash: `0xtx${calls.length}`, httpStatus: 200, body: JSON.stringify(PLACES) };
  };
  const deps = { catalog: async () => ({ wallets: [wallet] }), payRequest };
  return { calls, deps, payWith: (o) => pay(o, deps), spent: () => spent };
}

test('a store lookup is paid from the Agent Vault wallet and returns open stores first', async () => {
  const v = fakeVault();
  const r = await nearbyStores('Kakkanad, Kochi', { pay: v.payWith });
  assert.equal(r.paid, true);
  assert.equal(r.txHash, '0xtx1');
  assert.deepEqual(r.stores.map((s) => [s.name, s.openNow]), [['Finemart Supermarket', true], ['We Mart Hyper Market', false]]);
  assert.equal(v.calls[0].card, 'av_wallet_test');
  assert.equal(v.calls[0].maxAmount, '0.04', 'the agent never offers more than the list price');
  assert.match(v.calls[0].url, /fields=places\.displayName/, 'field mask travels in the URL (no custom headers through Agent Vault)');
});

test('the weekly budget allows two lookups; the third is refused and nothing is paid', async () => {
  const v = fakeVault();
  assert.equal((await nearbyStores('A', { pay: v.payWith })).paid, true);
  assert.equal((await nearbyStores('B', { pay: v.payWith })).paid, true);
  const third = await nearbyStores('C', { pay: v.payWith });
  assert.equal(third.paid, false);
  assert.equal(third.refused, true);
  assert.equal(third.code, 'limit_reached');
  assert.match(third.message, /nothing was paid/);
  assert.equal(v.spent().toFixed(2), '0.08');
});

test('after the limit the card stays paused until the owner resumes it', async () => {
  const v = fakeVault({ spent: 0.08 });
  assert.equal((await nearbyStores('A', { pay: v.payWith })).code, 'limit_reached');
  assert.equal((await nearbyStores('B', { pay: v.payWith })).code, 'card_paused');
});

test('a payment above the per-payment cap is refused on its own', async () => {
  const v = fakeVault({ perPayment: 0.02 });
  const r = await nearbyStores('Kochi', { pay: v.payWith });
  assert.equal(r.code, 'limit_reached');
});

test('a first payment to a new seller waits for the owner; nothing is paid', async () => {
  const r = await nearbyStores('Kochi', { pay: fakeVault({ approved: false }).payWith });
  assert.equal(r.paid, false);
  assert.equal(r.pending, true);
  assert.deepEqual(r.stores, []);
});

test('an empty wallet refuses before anything is sent', async () => {
  const r = await nearbyStores('Kochi', { pay: fakeVault({ balanceUsd: 0 }).payWith });
  assert.equal(r.code, 'insufficient_balance');
  assert.equal(r.payment.sent, false);
});

test('no wallet on the key: the owner is told what to do', async () => {
  const r = await pay({ url: BUY.places.url, maxAmount: '0.04' }, { catalog: async () => ({ walletNote: 'No agent wallet is set up yet. Set it up on Wallet.' }) });
  assert.equal(r.code, 'no_wallet');
  assert.match(r.message, /Wallet/);
});

test('the agent never holds more than tokens: no card number, key or password crosses pay()', async () => {
  const v = fakeVault();
  await nearbyStores('Kochi', { pay: v.payWith });
  const sent = JSON.stringify(v.calls);
  assert.doesNotMatch(sent, /\b\d{13,19}\b/, 'no card number');
  assert.doesNotMatch(sent, /0x[0-9a-f]{64}/i, 'no private key');
});

test('store parsing copes with empty and partial answers', () => {
  assert.deepEqual(parseStores({}), []);
  assert.deepEqual(parseStores({ places: [{ formattedAddress: 'no name' }] }), []);
  assert.deepEqual(parseStores({ places: [{ displayName: { text: 'X' } }] }), [{ name: 'X', address: '', rating: undefined, openNow: undefined }]);
});
