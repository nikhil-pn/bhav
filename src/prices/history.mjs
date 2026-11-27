// Read-only price history from the JSONL archive the older pricewatch tracker wrote
// (one line per product per poll, Zepto/Blinkit/Instamart in Kochi, since Jul 2026).
// The file is append-only and may be large (~620k lines, ~180 MB): we stream it once,
// lazily, into a small per-product summary and never write to it.
//
// Per product we keep counts, first/last seen, the all-time low, and run-length
// encoded prices for the 30 days before that product's last sighting (prices change
// about once per ~90 polls, so the runs stay tiny).

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Our price archive (append-only JSON lines). Set BHAV_PRICE_ARCHIVE to its path; without one,
// every item answers "no history yet" and the live prices still work.
export const ARCHIVE = process.env.BHAV_PRICE_ARCHIVE
  || join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.data', 'price-history.jsonl');

const WINDOW_MS = 30 * 24 * 3600 * 1000;
/** Within ±5% of the usual price counts as "normal". */
const BAND_PCT = 5;
/** Fewer observations than this and we don't claim a typical price. */
const MIN_OBS = 3;

let loading = null;

const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function addObservation(entry, t, price, inStock) {
  entry.count++;
  if (t < entry.first) entry.first = t;
  if (t > entry.last) entry.last = t;
  if (inStock && (entry.low == null || price < entry.low.price)) entry.low = { price, t };
  const runs = entry.runs;
  const tail = runs[runs.length - 1];
  if (tail && tail.p === price) { tail.n++; tail.t1 = t; } else runs.push({ t0: t, t1: t, p: price, n: 1 });
  if (runs.length > 256) pruneRuns(entry);
}

function pruneRuns(entry) {
  const cutoff = entry.last - WINDOW_MS;
  entry.runs = entry.runs.filter((r) => r.t1 >= cutoff);
}

/** Weighted median of the runs inside the window ending at `entry.last`. */
function typicalOf(entry) {
  const cutoff = entry.last - WINDOW_MS;
  const runs = entry.runs.filter((r) => r.t1 >= cutoff).sort((a, b) => a.p - b.p);
  const total = runs.reduce((s, r) => s + r.n, 0);
  if (total < MIN_OBS) return { typical: null, n: total };
  let seen = 0;
  for (const r of runs) { seen += r.n; if (seen * 2 >= total) return { typical: r.p, n: total }; }
  return { typical: runs[runs.length - 1].p, n: total };
}

/**
 * Stream the archive once and build the index. Safe to call many times; later
 * calls share the first load. Missing archive -> empty index (never throws).
 * @returns {Promise<{byKey: Map<string, object>, lines: number, bad: number, ms: number, archive: string}>}
 */
export function loadHistory() {
  if (loading) return loading;
  loading = (async () => {
    const t0 = Date.now();
    const byKey = new Map();
    let lines = 0;
    let bad = 0;
    if (!existsSync(ARCHIVE) || !statSync(ARCHIVE).isFile()) return { byKey, lines, bad, ms: 0, archive: ARCHIVE, missing: true };
    const rl = createInterface({ input: createReadStream(ARCHIVE, { encoding: 'utf8', flags: 'r' }), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line) continue;
      lines++;
      let r;
      try { r = JSON.parse(line); } catch { bad++; continue; }
      const price = Number(r.price);
      const t = Date.parse(r.ts);
      if (!r.platform || !r.variantId || !Number.isFinite(price) || !Number.isFinite(t)) { bad++; continue; }
      const key = `${r.platform}|${r.variantId}`;
      let e = byKey.get(key);
      if (!e) {
        e = { platform: r.platform, id: String(r.variantId), name: r.name, grams: r.weightInGms ?? null,
          units: r.unitCount ?? null, count: 0, first: t, last: t, low: null, runs: [] };
        byKey.set(key, e);
      }
      e.name = r.name || e.name;
      if (r.weightInGms) e.grams = r.weightInGms;
      if (r.unitCount) e.units = r.unitCount;
      addObservation(e, t, price, !r.outOfStock);
    }
    for (const e of byKey.values()) pruneRuns(e);
    // Secondary lookup by platform + normalised name, for when a store re-issues ids.
    const byName = new Map();
    for (const e of byKey.values()) {
      const k = `${e.platform}|${normName(e.name)}`;
      byName.set(k, [...(byName.get(k) || []), e]);
    }
    return { byKey, byName, lines, bad, ms: Date.now() - t0, archive: ARCHIVE };
  })();
  return loading;
}

const iso = (t) => (t == null ? null : new Date(t).toISOString());

function summary(e, matchedBy) {
  if (!e) return null;
  const { typical, n } = typicalOf(e);
  return {
    platform: e.platform,
    id: e.id,
    name: e.name,
    matchedBy,
    observations: e.count,
    firstSeen: iso(e.first),
    lastSeen: iso(e.last),
    typical,
    typicalWindow: { from: iso(e.last - WINDOW_MS), to: iso(e.last), observations: n },
    allTimeLow: e.low ? { price: e.low.price, date: iso(e.low.t) } : null,
  };
}

/**
 * Archive summary for one live offer: matched by platform + id, else by platform + exact name
 * + same pack size (`matchedBy` says which).
 * `typical` is the median over the 30 days before the product was last seen in the archive.
 * @param {{platform:string, id:string, name?:string, grams?:number|null, units?:number|null}} offer
 * @returns {Promise<null|{platform:string,id:string,name:string,matchedBy:'id'|'name',observations:number,firstSeen:string,lastSeen:string,
 *   typical:number|null, typicalWindow:{from:string,to:string,observations:number}, allTimeLow:{price:number,date:string}|null}>}
 */
export async function historyFor(offer) {
  const { byKey, byName } = await loadHistory();
  const exact = byKey.get(`${offer.platform}|${offer.id}`);
  if (exact) return summary(exact, 'id');
  if (!offer.name || !byName) return null;
  // Same name on the same store, and the same pack size (±15%), most recently seen first.
  const sameSize = (e) => (offer.units && e.units ? offer.units === e.units
    : offer.grams && e.grams ? Math.abs(offer.grams - e.grams) / e.grams <= 0.15
      : !offer.grams && !offer.units);
  const cands = (byName.get(`${offer.platform}|${normName(offer.name)}`) || []).filter(sameSize);
  cands.sort((a, b) => b.last - a.last);
  return summary(cands[0], 'name');
}

/**
 * Is this live price a real deal against its own history?
 * deal: ≥5% under the usual price, or at/below the all-time low · pricier: ≥5% over · normal: in between
 * · unknown: the archive has no (or too little) history for this product.
 * @param {{platform:string, id:string, name?:string, price:number}} offer
 * @returns {Promise<{verdict:'deal'|'normal'|'pricier'|'unknown', pctVsTypical:number|null, typical:number|null,
 *   allTimeLow:{price:number,date:string}|null, newLow:boolean, history:object|null}>}
 */
export async function isRealDeal(offer) {
  const h = await historyFor(offer);
  if (!h || h.typical == null) {
    return { verdict: 'unknown', pctVsTypical: null, typical: null, allTimeLow: h?.allTimeLow ?? null, newLow: false, history: h };
  }
  const pct = Math.round(((offer.price - h.typical) / h.typical) * 1000) / 10;
  const newLow = h.allTimeLow != null && offer.price < h.allTimeLow.price;
  const atLow = h.allTimeLow != null && offer.price <= h.allTimeLow.price && offer.price < h.typical;
  const verdict = pct <= -BAND_PCT || atLow ? 'deal' : pct >= BAND_PCT ? 'pricier' : 'normal';
  return { verdict, pctVsTypical: pct, typical: h.typical, allTimeLow: h.allTimeLow, newLow, history: h };
}

/**
 * Find archived products whose name contains every word of `text` (e.g. "relish curry cut").
 * @param {string} text
 * @param {{platform?: string, limit?: number}} [opts]
 */
export async function searchHistory(text, { platform, limit = 20 } = {}) {
  const { byKey } = await loadHistory();
  const words = normName(text).split(' ').filter(Boolean);
  const out = [];
  for (const e of byKey.values()) {
    if (platform && e.platform !== platform) continue;
    const name = normName(e.name);
    if (words.every((w) => name.includes(w))) out.push(summary(e, 'search'));
  }
  return out.sort((a, b) => b.observations - a.observations).slice(0, limit);
}
