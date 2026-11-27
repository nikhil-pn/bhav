// What the household agent buys through Agent Vault, beyond Bhav's own prices.
// When the apps are dear or out of stock, it looks up open supermarkets nearby (Google Places on Buy,
// $0.04 a lookup), paid from the owner's Agent Vault wallet on Celo mainnet. The owner gives the agent
// a weekly grocery-research budget on its Agent Vault card ($0.10 a week, $0.05 a payment): two lookups
// fit; the third is refused by Agent Vault and the card pauses until the owner resumes it.
import { pay as vaultPay } from './vault.mjs';

const FIELDS = 'places.displayName,places.formattedAddress,places.rating,places.currentOpeningHours.openNow';
export const BUY = {
  // Agent Vault cannot send custom headers, so Places' field mask goes in the URL (`fields=`), which Google accepts.
  places: { url: `https://usebuy.ai/google/places/v1/places:searchText?fields=${FIELDS}`, usd: '0.04' },
};

/**
 * Nearby supermarkets for an area, open ones first. $0.04 from the Agent Vault wallet.
 * @returns {Promise<{paid:boolean, stores:{name:string,address:string,rating?:number,openNow?:boolean}[], refused?:boolean, code?:string, message?:string, txHash?:string}>}
 */
export async function nearbyStores(area = 'Kakkanad, Kochi', { pay = vaultPay, waitSeconds } = {}) {
  const r = await pay({
    url: BUY.places.url, method: 'POST', maxAmount: BUY.places.usd, waitSeconds,
    body: { textQuery: `supermarket in ${area}`, maxResultCount: 3 },
  });
  if (!r.paid) return { ...r, stores: [] };
  let stores = [];
  try { stores = parseStores(JSON.parse(r.body || '{}')); } catch { /* not JSON */ }
  return { ...r, stores };
}

/** Google Places (New) answer → plain store list, open ones first. */
export function parseStores(j) {
  return (j?.places ?? [])
    .map((p) => ({ name: p.displayName?.text ?? '', address: p.formattedAddress ?? '', rating: p.rating, openNow: p.currentOpeningHours?.openNow }))
    .filter((s) => s.name)
    .sort((a, b) => Number(b.openNow === true) - Number(a.openNow === true));
}
