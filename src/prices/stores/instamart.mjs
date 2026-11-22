// Swiggy Instamart: the store is picked from an httpOnly cookie, so cookies can't
// set the location. Instead the context gets a fixed browser geolocation, we press
// "Use current location" once, and later searches reuse the userLocation cookie. We read the
// /api/instamart/search JSON the search page fetches. Prices are rupees.
// Instamart answers bursts with 429, so the caller runs these one at a time.

import { captureJson, USER_AGENT } from '../browser.mjs';
import { makeOffer, parsePieces, parseSize } from '../parse.mjs';

// The results call only (search/v2), not suggestion or filter side calls.
const API = /\/api\/instamart\/search(\/v\d+)?\?/;

/** @param {import('playwright').Browser} browser */
export async function createContext(browser, { lat, lng }) {
  const ctx = await browser.newContext({
    userAgent: USER_AGENT, viewport: { width: 1366, height: 900 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata',
    geolocation: { latitude: lat, longitude: lng }, permissions: ['geolocation'],
  });
  ctx.bhavLoc = { lat, lng };
  return ctx;
}

/** The userLocation cookie Swiggy sets once a location is chosen, parsed, or null. */
async function chosenLocation(ctx) {
  const c = (await ctx.cookies('https://www.swiggy.com')).find((x) => x.name === 'userLocation');
  try { return c ? JSON.parse(decodeURIComponent(c.value)) : null; } catch { return null; }
}

/**
 * Press "Use current location" (the context's fake GPS answers) until Swiggy stores a
 * userLocation cookie. Throws if it never does: without it Instamart quietly serves a
 * default city's store, and those prices would be wrong for Kochi.
 */
async function pickLocation(ctx, { lat, lng }, timeoutMs) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const page = await ctx.newPage();
    try {
      await page.goto('https://www.swiggy.com/instamart', { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      const btn = page.getByText(/use (my )?current location/i).first();
      if (!(await btn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false))) {
        await page.getByText(/add your location|select location/i).first().click({ timeout: 3000 }).catch(() => {});
        await btn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      }
      // Re-apply the fake position after the page loaded: in Chrome 156 an override set
      // before navigation often doesn't reach Swiggy's request (POSITION_UNAVAILABLE).
      await ctx.setGeolocation({ latitude: lat, longitude: lng });
      await btn.click({ timeout: 4000 }).catch(() => {});
      for (let i = 0; i < 16 && !(await chosenLocation(ctx)); i++) await page.waitForTimeout(500);
    } finally {
      await page.close().catch(() => {});
    }
    const loc = await chosenLocation(ctx);
    if (loc && Math.abs(loc.lat - lat) < 0.05 && Math.abs(loc.lng - lng) < 0.05) return loc;
  }
  throw new Error('could not set the Instamart delivery location');
}

const money = (m) => (m?.units != null ? Number(m.units) + (m.nanos || 0) / 1e9 : null);

/** Product groups are objects with a `variations` array; each variation is one pack size. */
function* variations(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) yield* variations(x); return; }
  if (Array.isArray(node.variations) && (node.displayName || node.brand)) {
    for (const v of node.variations) yield [node, v];
    return;
  }
  for (const k of Object.keys(node)) yield* variations(node[k]);
}

function toOffer(group, v) {
  const id = v?.spinId || v?.skuId;
  const name = v?.displayName || group.displayName;
  const price = money(v?.price?.offerPrice) ?? money(v?.price?.mrp);
  if (!id || !name || price == null) return null;
  const pack = v.quantityDescription || null;
  const size = parseSize(pack);
  const units = parsePieces(pack);
  return makeOffer({
    platform: 'instamart', id, name, price,
    mrp: money(v.price?.mrp) ?? price,
    // A tray of eggs has no useful per-kg price, so counted goods keep only `units`.
    grams: size?.grams || (units ? null : v.weightInGrams), units, volume: size?.volume, pack,
    inStock: (typeof v.inventory === 'number' ? v.inventory > 0 : !!v.inventory?.inStock) || group.inStock === true,
    url: `https://www.swiggy.com/instamart/item/${id}`,
  });
}

/**
 * Search Instamart and return normalised offers.
 * @param {import('playwright').BrowserContext} ctx
 */
export async function search(ctx, query, { timeoutMs = 45000 } = {}) {
  const url = `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(query)}`;
  const run = () => captureJson(ctx, API, (page) => page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs }));
  if (!(await chosenLocation(ctx))) await pickLocation(ctx, ctx.bhavLoc, timeoutMs);
  let offers = parse(await run());
  if (!offers.length) { // store cookie lapsed, or a cold first search came back empty: choose the location again, once
    await pickLocation(ctx, ctx.bhavLoc, timeoutMs);
    offers = parse(await run());
  }
  return offers;
}

function parse(bodies) {
  const byId = new Map();
  for (const body of bodies) for (const [group, v] of variations(body?.data ?? body)) {
    const o = toOffer(group, v);
    if (o && (!byId.has(o.id) || (!byId.get(o.id).inStock && o.inStock))) byId.set(o.id, o);
  }
  return [...byId.values()];
}
