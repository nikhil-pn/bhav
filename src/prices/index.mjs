// Bhav price layer, public entry point.
// quote(query) = live offers from three Kochi quick-commerce stores, each checked
// against its own price history, the single best pick, and a one-line answer.

import { searchAll, pickBasis, rank, PLATFORMS } from './live.mjs';
import { isRealDeal, loadHistory } from './history.mjs';
import { relevant } from './match.mjs';

export { searchAll, cheapest, PLATFORMS, KOCHI } from './live.mjs';
export { historyFor, isRealDeal, searchHistory, loadHistory } from './history.mjs';
export { closeBrowser } from './browser.mjs';

const STORE_NAME = { zepto: 'Zepto', blinkit: 'Blinkit', instamart: 'Swiggy Instamart' };
const rupees = (n) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;

function basisLabel(by, offer, query) {
  if (by === 'perKg') return offer.volume ? '/L' : '/kg';
  if (by === 'perUnit') return /\begg/i.test(query) || /\begg/i.test(offer.name) ? '/egg' : '/piece';
  return '';
}

function packText(o) {
  if (o.pack && /\dx|\bx\b|\d\s*x\s*\d/i.test(o.pack)) return o.pack; // keep multipacks visible: "500 ml x 2"
  if (o.units) return `${o.units} pcs`;
  if (o.grams) return o.grams >= 1000 ? `${o.grams / 1000} ${o.volume ? 'L' : 'kg'}` : `${o.grams} ${o.volume ? 'ml' : 'g'}`;
  return o.pack || 'pack';
}

/** One plain-English line for the best pick. */
export function answerLine(query, by, best, deal) {
  if (!best) return `No in-stock match for "${query}" on ${PLATFORMS.map((p) => STORE_NAME[p]).join(', ')} right now.`;
  const unitPrice = by === 'price' ? rupees(best.price) : `${rupees(best[by])}${basisLabel(by, best, query)}`;
  const head = `Cheapest ${query}: ${unitPrice} on ${STORE_NAME[best.platform]} (${best.name}, ${packText(best)} for ${rupees(best.price)})`;
  const usual = deal.typical != null ? rupees(deal.typical) : null;
  switch (deal.verdict) {
    case 'deal':
      return `${head}, ${Math.round(Math.abs(deal.pctVsTypical))}% below its usual ${usual}${deal.newLow ? ', its lowest price on record' : ''} — a real deal.`;
    case 'pricier':
      return `${head}, ${Math.round(deal.pctVsTypical)}% above its usual ${usual} — cheapest today, but not a great day to buy.`;
    case 'normal':
      return `${head}, about its usual price (${usual}).`;
    default:
      return `${head}. No price history for this item yet, so we can't say if it's a deal.`;
  }
}

/**
 * Live quote for a grocery query in Kochi.
 * @param {string} query e.g. "chicken curry cut", "eggs 30", "milk 1 litre"
 * @param {{by?: 'perKg'|'perUnit'|'price', limit?: number} & Parameters<typeof searchAll>[1]} [opts]
 *   `by` defaults to an automatic choice (per egg for counted goods, per kg/L when sizes are known).
 * @returns {Promise<{query:string, by:string, answer:string, best:object|null, offers:object[],
 *   matched:number, scanned:number, errors:Record<string,string>, timings:object, historyAsOf:string|null}>}
 */
export async function quote(query, { by, limit = 10, ...opts } = {}) {
  const historyReady = loadHistory(); // stream the archive while the stores answer
  const res = await searchAll(query, opts);
  const basis = by || pickBasis(query, res.offers.filter((o) => relevant(o, query)));
  const ranked = rank(res.offers, query, basis);
  const top = ranked.slice(0, limit);
  const deals = await Promise.all(top.map((o) => isRealDeal(o)));
  const offers = top.map((o, i) => {
    const { history, ...deal } = deals[i];
    return { ...o, deal: { ...deal, observations: history?.observations ?? 0, matchedBy: history?.matchedBy ?? null,
      lastSeen: history?.lastSeen ?? null } };
  });
  const best = offers[0] || null;
  const idx = await historyReady;
  let asOf = 0;
  for (const e of idx.byKey.values()) if (e.last > asOf) asOf = e.last;
  return {
    query,
    by: basis,
    answer: answerLine(query, basis, best, best?.deal || { verdict: 'unknown' }),
    best,
    offers,
    matched: ranked.length,
    scanned: res.offers.length,
    errors: res.errors,
    timings: res.timings,
    historyAsOf: asOf ? new Date(asOf).toISOString() : null,
  };
}
