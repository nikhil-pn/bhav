// Blinkit: Cloudflare + TLS fingerprinting block plain HTTP, so a real browser loads
// the search page and we read the /v1/layout/search JSON it fetches. Location comes
// from gr_1_lat / gr_1_lon cookies. Prices are display strings in rupees ("₹414").

import { captureJson, USER_AGENT } from '../browser.mjs';
import { makeOffer, parsePieces, parseSize, slug, toRupees } from '../parse.mjs';

const API = '/v1/layout/search';
const text = (x) => (x && typeof x === 'object' && 'text' in x ? x.text : x);

/** @param {import('playwright').Browser} browser */
export async function createContext(browser, { lat, lng }) {
  const ctx = await browser.newContext({
    userAgent: USER_AGENT, viewport: { width: 1366, height: 900 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata',
  });
  const cookie = (name, value) => ({ name, value, domain: '.blinkit.com', path: '/' });
  await ctx.addCookies([cookie('gr_1_lat', String(lat)), cookie('gr_1_lon', String(lng)), cookie('gr_1_locality', 'Kochi')]);
  return ctx;
}

function toOffer(d) {
  const id = d?.product_id;
  const name = text(d?.name);
  const price = toRupees(text(d?.normal_price)) ?? toRupees(text(d?.mrp));
  if (!id || !name || price == null) return null;
  const pack = text(d.variant) || null;
  const size = parseSize(pack);
  return makeOffer({
    platform: 'blinkit', id, name, price,
    mrp: toRupees(text(d.mrp)) ?? price,
    grams: size?.grams, units: parsePieces(pack), volume: size?.volume, pack,
    inStock: d.inventory > 0,
    url: `https://blinkit.com/prn/${slug(name)}/prid/${id}`,
  });
}

/**
 * Search Blinkit and return normalised offers.
 * @param {import('playwright').BrowserContext} ctx
 */
export async function search(ctx, query, { timeoutMs = 45000 } = {}) {
  const bodies = await captureJson(ctx, API, (page) =>
    page.goto(`https://blinkit.com/s/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs }));
  const byId = new Map();
  for (const body of bodies) {
    for (const snip of body?.response?.snippets || []) {
      // A card can carry sibling pack sizes in variant_list; each is its own offer.
      for (const d of [snip?.data, ...(snip?.data?.variant_list || []).map((v) => v?.data)]) {
        const o = toOffer(d);
        if (o && (!byId.has(o.id) || (!byId.get(o.id).inStock && o.inStock))) byId.set(o.id, o);
      }
    }
  }
  return [...byId.values()];
}
