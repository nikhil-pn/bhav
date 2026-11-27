// What the household agent buys through Agent Vault, beyond Bhav's own prices.
// Both are Buy (usebuy.ai) services paid from the owner's Agent Vault wallet on Celo mainnet,
// so the agent card's limits decide: the cheap one goes through, the dear one is refused.
import { pay as vaultPay } from './vault.mjs';

export const BUY = {
  deals: { url: 'https://gateway.usebuy.ai/v1/social/reddit/posts/search', usd: '0.005' },
  places: { url: 'https://usebuy.ai/google/places/v1/places:searchText', usd: '0.04' },
};

/** $0.005: recent Reddit posts about the item on Zepto/Blinkit/Instamart (people share deals and price jumps).
 * (Buy's X search seller failed twice after payment on 28 Nov, so Reddit it is.) */
export async function dealChatter(item, { pay = vaultPay, waitSeconds } = {}) {
  const r = await pay({ waitSeconds,
    url: BUY.deals.url, method: 'POST', maxAmount: BUY.deals.usd,
    body: { query: `${item} zepto blinkit instamart price`, sort: 'new', timeRange: 'month' },
  });
  if (!r.paid) return { ...r, posts: [] };
  let posts = [];
  try { posts = extractPosts(JSON.parse(r.body || '{}')); } catch { /* answer is not JSON */ }
  return { ...r, posts };
}

/** $0.04: nearby supermarkets, as a fallback when the apps are out of stock. Above a $0.02 cap. */
export async function nearbyStores(area = 'Kochi', { pay = vaultPay } = {}) {
  return pay({
    url: BUY.places.url, method: 'POST', maxAmount: BUY.places.usd,
    body: { textQuery: `supermarket in ${area}`, maxResultCount: 3 },
  });
}

/** Pull short post texts out of whatever shape the search route answers with. */
export function extractPosts(j, out = []) {
  if (!j || typeof j !== 'object' || out.length >= 5) return out;
  if (Array.isArray(j)) { for (const x of j) extractPosts(x, out); return out; }
  const text = j.title || j.full_text || j.text || j.legacy?.full_text;
  if (typeof text === 'string' && text.length > 10) out.push(text.replace(/\s+/g, ' ').slice(0, 160));
  for (const v of Object.values(j)) if (v && typeof v === 'object') extractPosts(v, out);
  return [...new Set(out)].slice(0, 5);
}
