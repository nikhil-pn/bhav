// Small parsers shared by the store adapters: rupee strings, pack sizes, piece counts,
// and the one function that turns a store's raw fields into Bhav's offer shape.

/** "₹1,249.50" -> 1249.5 ; numbers pass through ; junk -> null */
export function toRupees(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const m = String(v).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

const UNIT_GRAMS = { kg: 1000, g: 1, gm: 1, gms: 1, gram: 1, grams: 1, l: 1000, ltr: 1000, litre: 1000, liter: 1000, ml: 1 };
const VOLUME = new Set(['l', 'ltr', 'litre', 'liter', 'ml']);
const UNIT = '(kg|gms|gm|grams|gram|g|ltr|litre|liter|ml|l)\\b';
const SIZE_RE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:x\\s*(\\d+(?:\\.\\d+)?)\\s*)?${UNIT}`);  // "450 g", "2 x 450 g"
const SIZE_TIMES_RE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${UNIT}\\s*x\\s*(\\d+)`); // "500 ml x 2"

/**
 * Pack size from text: "2 x 450 g" or "450 g x 2" -> {grams: 900, volume: false}; "1 L" -> {grams: 1000, volume: true}.
 * Millilitres are counted as grams (close enough for milk, oil, curd).
 * @returns {{grams:number, volume:boolean}|null}
 */
export function parseSize(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  const tm = t.match(SIZE_TIMES_RE);
  if (tm) return { grams: Math.round(Number(tm[1]) * Number(tm[3]) * UNIT_GRAMS[tm[2]]), volume: VOLUME.has(tm[2]) };
  const m = t.match(SIZE_RE);
  if (!m) return null;
  const n = m[2] ? Number(m[1]) * Number(m[2]) : Number(m[1]);
  return { grams: Math.round(n * UNIT_GRAMS[m[3]]), volume: VOLUME.has(m[3]) };
}

/** Piece count: "30 pcs", "2 x 6 pcs", "10 Pieces x 3", "1 pack (12 pieces)" -> number|null */
export function parsePieces(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  const PC = '(?:pc|pcs|piece|pieces|nos|eggs?)\\b';
  let m = t.match(new RegExp(`(\\d+)\\s*x\\s*(\\d+)\\s*${PC}`));
  if (m) return Number(m[1]) * Number(m[2]);
  m = t.match(new RegExp(`(\\d+)\\s*${PC}\\s*x\\s*(\\d+)`));
  if (m) return Number(m[1]) * Number(m[2]);
  m = t.match(new RegExp(`(\\d+)\\s*${PC}`));
  return m ? Number(m[1]) : null;
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Build a normalised offer. `grams`/`units` may be null when the store gives no size.
 * @returns {{platform:string,id:string,name:string,price:number,mrp:number,grams:number|null,
 *   units:number|null,perKg:number|null,perUnit:number|null,inStock:boolean,url:string|null,
 *   fetchedAt:string,pack:string|null,volume:boolean}}
 */
export function makeOffer({ platform, id, name, price, mrp, grams, units, volume = false, inStock, url, pack }) {
  const g = grams > 0 ? grams : null;
  const u = units > 0 ? units : null;
  return {
    platform,
    id: String(id),
    name: String(name).trim(),
    price,
    mrp: mrp ?? price,
    grams: g,
    units: u,
    perKg: g ? Math.round((price / g) * 1000) : null,
    perUnit: u ? round2(price / u) : null,
    inStock: !!inStock,
    url: url || null,
    fetchedAt: new Date().toISOString(),
    pack: pack || null,
    volume: !!volume,
  };
}

/** URL-safe slug for product links. */
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
