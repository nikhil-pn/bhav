// Live prices from Zepto, Blinkit and Swiggy Instamart for one location (Kochi by default).
// One shared browser, one context per store+location kept warm between searches,
// a 10-minute in-memory cache, and one search at a time per store so we stay polite.
// A store that fails or times out is reported in `errors`; the others still answer.

import { getBrowser, onBrowserClose } from './browser.mjs';
import * as zepto from './stores/zepto.mjs';
import * as blinkit from './stores/blinkit.mjs';
import * as instamart from './stores/instamart.mjs';
import { relevant, sizeMatches, sizeWanted } from './match.mjs';

export const STORES = { zepto, blinkit, instamart };
export const PLATFORMS = Object.keys(STORES);

/** Kochi points the older tracker used (each resolves to a serviceable dark store). */
export const KOCHI = {
  zepto: { lat: 9.9312328, lng: 76.2673041 },
  blinkit: { lat: 10.0294393, lng: 76.3080187 },
  instamart: { lat: 10.0294393, lng: 76.3080187 },
};

const CACHE_MS = Number(process.env.BHAV_PRICE_CACHE_MS || 10 * 60 * 1000);
/** Minimum gap between two searches on the same store. Instamart 429s on bursts. */
const GAP_MS = { zepto: 1000, blinkit: 1000, instamart: 4000 };

const cache = new Map();     // key -> {at, offers}
const inflight = new Map();  // key -> Promise<offers>
const contexts = new Map();  // platform|lat|lng -> Promise<BrowserContext>
const queues = new Map();    // platform -> {tail: Promise, last: number}

onBrowserClose(() => contexts.clear());

function locFor(platform, lat, lng) {
  return lat != null && lng != null ? { lat, lng } : KOCHI[platform];
}

function contextFor(platform, loc) {
  const key = `${platform}|${loc.lat}|${loc.lng}`;
  if (!contexts.has(key)) {
    const p = getBrowser().then((b) => STORES[platform].createContext(b, loc));
    p.catch(() => contexts.delete(key));
    contexts.set(key, p);
  }
  return contexts.get(key);
}

/** Run `fn` after the previous search on this store finished, keeping GAP_MS between starts. */
function enqueue(platform, fn) {
  const q = queues.get(platform) || { tail: Promise.resolve(), last: 0 };
  const run = q.tail.then(async () => {
    const wait = q.last + GAP_MS[platform] - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    q.last = Date.now();
    return fn();
  });
  q.tail = run.catch(() => {});
  queues.set(platform, q);
  return run;
}

function withTimeout(promise, ms, label) {
  let t;
  return Promise.race([
    promise,
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${label} timed out after ${ms} ms`)), ms); }),
  ]).finally(() => clearTimeout(t));
}

async function searchOne(platform, query, loc, timeoutMs) {
  const key = `${platform}|${loc.lat}|${loc.lng}|${query.trim().toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return { offers: hit.offers, cached: true, ms: 0 };
  if (!inflight.has(key)) {
    const t0 = Date.now();
    const job = enqueue(platform, async () => {
      const ctx = await contextFor(platform, loc);
      return withTimeout(STORES[platform].search(ctx, query, { timeoutMs }), timeoutMs, platform);
    }).then((offers) => {
      if (offers.length) cache.set(key, { at: Date.now(), offers }); // never cache an empty answer
      return { offers, cached: false, ms: Date.now() - t0 };
    }).finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  return inflight.get(key);
}

/**
 * Search every store at once and return normalised offers (all results, unfiltered).
 * Never throws for a store failure: that store's message goes in `errors`.
 * @param {string} query e.g. "chicken curry cut"
 * @param {{platforms?: string[], lat?: number, lng?: number, timeoutMs?: number}} [opts]
 *   lat/lng override every store's location; default is a Kochi point per store.
 * @returns {Promise<{query:string, offers:object[], errors:Record<string,string>, timings:Record<string,{ms:number,cached:boolean,count:number}>}>}
 */
export async function searchAll(query, { platforms = PLATFORMS, lat, lng, timeoutMs = 45000 } = {}) {
  const errors = {};
  const timings = {};
  const lists = await Promise.all(platforms.map(async (platform) => {
    if (!STORES[platform]) { errors[platform] = 'unknown platform'; return []; }
    try {
      const r = await searchOne(platform, query, locFor(platform, lat, lng), timeoutMs);
      timings[platform] = { ms: r.ms, cached: r.cached, count: r.offers.length };
      if (!r.offers.length) errors[platform] = 'no products captured (blocked, closed store, or nothing matched)';
      return r.offers;
    } catch (e) {
      errors[platform] = String(e?.message || e).split('\n')[0].slice(0, 200);
      return [];
    }
  }));
  return { query, offers: lists.flat(), errors, timings };
}

/**
 * Pick the basis to compare on: per piece for counted goods (eggs, "30"),
 * per kg/litre when most matches have a size, else the shelf price.
 * @returns {'perKg'|'perUnit'|'price'}
 */
export function pickBasis(query, offers) {
  const want = sizeWanted(query);
  if (want.units) return 'perUnit';
  const n = offers.length || 1;
  const withUnits = offers.filter((o) => o.perUnit != null).length;
  const withKg = offers.filter((o) => o.perKg != null).length;
  if (/\begg/i.test(query) && withUnits) return 'perUnit';
  if (withKg / n >= 0.5) return 'perKg';
  if (withUnits / n >= 0.5) return 'perUnit';
  return 'price';
}

/**
 * Relevant, in-stock offers sorted cheapest first on the chosen basis
 * (restricted to the asked-for pack size when any listing has it).
 * @param {object[]} offers from searchAll
 * @param {string} query
 * @param {'perKg'|'perUnit'|'price'} by
 */
export function rank(offers, query, by) {
  const ok = offers.filter((o) => o.inStock && o[by] != null && relevant(o, query));
  // If the query names a size ("eggs 30", "milk 1 litre") and some packs match it, compare only those.
  const sized = ok.filter((o) => sizeMatches(o, query));
  return (sized.length ? sized : ok).sort((a, b) => a[by] - b[by] || a.price - b.price);
}

/**
 * Cheapest relevant in-stock offer for a query across the stores.
 * @param {string} query
 * @param {{by?: 'perKg'|'perUnit'|'price'} & Parameters<typeof searchAll>[1]} [opts] `by` defaults to pickBasis()
 * @returns {Promise<{query:string, by:string, best:object|null, ranked:object[], errors:Record<string,string>}>}
 */
export async function cheapest(query, { by, ...opts } = {}) {
  const res = await searchAll(query, opts);
  const basis = by || pickBasis(query, res.offers.filter((o) => relevant(o, query)));
  const ranked = rank(res.offers, query, basis);
  return { query, by: basis, best: ranked[0] || null, ranked, errors: res.errors, timings: res.timings };
}
