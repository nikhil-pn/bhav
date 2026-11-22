// Zepto: the search page calls a signed search API (search-federator-service since
// Nov 2026; user-search-service before), so we load the real page and read that JSON. Location comes from
// lat/lng cookies. Prices are in paise.

import { captureJson, USER_AGENT } from '../browser.mjs';
import { makeOffer, parsePieces, parseSize, slug } from '../parse.mjs';

// Either generation of the search API, but not the /search/filters side call.
const API = /\/(search-federator-service\/api\/v\d+|user-search-service\/api\/v\d+)\/search(\?|$)/;

/** @param {import('playwright').Browser} browser */
export async function createContext(browser, { lat, lng }) {
  const ctx = await browser.newContext({
    userAgent: USER_AGENT, viewport: { width: 1366, height: 900 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata',
  });
  const cookie = (name, value) => ({ name, value, domain: '.zepto.com', path: '/' });
  await ctx.addCookies([
    cookie('latitude', String(lat)),
    cookie('longitude', String(lng)),
    cookie('user_position', JSON.stringify({ latitude: lat, longitude: lng })),
  ]);
  return ctx;
}

/** Walk the layout tree; a product card is any object with a numeric sellingPrice and an outOfStock flag. */
function* cards(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) yield* cards(x); return; }
  if (typeof node.sellingPrice === 'number' && 'outOfStock' in node) yield node;
  for (const k of Object.keys(node)) yield* cards(node[k]);
}

function toOffer(card) {
  const product = card.product || card.productResponse?.product || {};
  const variant = card.productVariant || card.productResponse?.productVariant || {};
  const id = variant.id || card.productVariantId || card.id;
  const name = product.name || card.name || variant.name;
  if (!id || !name) return null;
  const pack = variant.formattedPacksize || null;
  const size = parseSize(pack);
  let grams = size?.grams || variant.weightInGms || null; // the pack label wins: weightInGms can disagree (500 vs "450 g")
  let units = parsePieces(pack) ?? (variant.unitOfMeasure === 'PIECE' ? Number(variant.packsize) || null : null);
  if (units === 1 && grams > 120) units = null; // "1 pack" that is really a tray: unknown, not 1
  if (units && !size) grams = null; // counted goods: the catalogue weight is unreliable, compare per piece
  return makeOffer({
    platform: 'zepto', id, name,
    price: card.sellingPrice / 100,
    mrp: (card.mrp ?? variant.mrp ?? card.sellingPrice) / 100,
    grams, units, volume: size?.volume, pack,
    inStock: !card.outOfStock,
    url: `https://www.zepto.com/pn/${slug(name)}/pvid/${id}`,
  });
}

/**
 * Search Zepto and return normalised offers.
 * @param {import('playwright').BrowserContext} ctx
 */
export async function search(ctx, query, { timeoutMs = 45000 } = {}) {
  const bodies = await captureJson(ctx, API, async (page) => {
    await page.goto(`https://www.zepto.com/search?query=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded', timeout: timeoutMs,
    });
    // The URL alone sometimes fires only autosuggest; submitting the box fires the full search.
    try {
      const box = page.locator('input[type="search"], input[role="combobox"], input[type="text"]').first();
      await box.fill(query, { timeout: 4000 });
      await box.press('Enter');
    } catch { /* layout differs; the URL search usually suffices */ }
  });
  const byId = new Map();
  for (const body of bodies) for (const c of cards(body)) {
    const o = toOffer(c);
    if (o && (!byId.has(o.id) || (!byId.get(o.id).inStock && o.inStock))) byId.set(o.id, o);
  }
  return [...byId.values()];
}
