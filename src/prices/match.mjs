// Does a store listing answer the shopper's question? Store search is fuzzy (a
// "chicken curry cut" search also returns curry masala and pet food), so before
// comparing prices we keep only listings whose name carries every query word and
// none of the obvious "this is a different product" words.

const UNIT_WORDS = new Set(['kg', 'kgs', 'g', 'gm', 'gms', 'gram', 'grams', 'l', 'ltr', 'litre', 'litres', 'liter', 'liters',
  'ml', 'pc', 'pcs', 'piece', 'pieces', 'pack', 'packs', 'dozen', 'nos', 'x']);
const STOP_WORDS = new Set(['a', 'an', 'the', 'of', 'for', 'and', 'with', 'fresh', 'best', 'cheap', 'cheapest', 'buy', 'price', 'in', 'kochi']);
/** Words that turn a staple into a different product; ignored when the query itself uses them. */
const OFF_WORDS = ['masala', 'marinated', 'marinade', 'pickle', 'powder', 'gravy', 'sauce', 'spread', 'flavour', 'flavoured',
  'flavored', 'chocolate', 'shake', 'biscuit', 'cake', 'cookie', 'kebab', 'sausage', 'nugget', 'salami', 'dog', 'cat', 'pet',
  'puppy', 'kitten', 'quail', 'duck', 'candle', 'shampoo', 'soap', 'mayonnaise', 'noodle', 'noodles', 'roll', 'momo', 'momos'];

const stem = (w) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, ' ').split(' ').filter(Boolean);

/**
 * Pack size the query asks for, if any: "milk 1 litre" -> {grams: 1000}, "eggs 30" -> {units: 30},
 * "1 dozen eggs" -> {units: 12}.
 * @returns {{grams?: number, units?: number}}
 */
export function sizeWanted(query) {
  const q = String(query).toLowerCase();
  const m = q.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|grams?|l|ltr|litres?|liters?|ml)\b/);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2];
    const grams = /^(kg|kgs|l|ltr|litres?|liters?)$/.test(unit) ? n * 1000 : n;
    return { grams };
  }
  const dozen = q.match(/(\d+)?\s*dozen/);
  if (dozen) return { units: 12 * Number(dozen[1] || 1) };
  const count = q.match(/\b(\d+)\s*(?:pcs?|pieces?|nos)?\b/);
  if (count) return { units: Number(count[1]) };
  return {};
}

/** Content words of the query (no numbers, units or filler). */
export function queryWords(query) {
  return words(query).filter((w) => !/^\d/.test(w) && !UNIT_WORDS.has(w) && !STOP_WORDS.has(w)).map(stem);
}

/**
 * True when the offer's name contains every content word of the query and no
 * "different product" word the query didn't ask for.
 * @param {{name:string}} offer
 * @param {string} query
 */
export function relevant(offer, query) {
  const name = words(offer.name).map(stem);
  const nameSet = new Set(name);
  const want = queryWords(query);
  if (!want.length) return true;
  if (!want.every((w) => nameSet.has(w))) return false;
  const asked = new Set(want);
  return !OFF_WORDS.some((w) => nameSet.has(stem(w)) && !asked.has(stem(w)));
}

/**
 * Does the offer's pack match the size the query asked for (±15% on weight, exact on pieces)?
 * Offers are always kept when the query names no size.
 */
export function sizeMatches(offer, query) {
  const want = sizeWanted(query);
  if (want.units) return offer.units === want.units;
  if (want.grams) return offer.grams != null && Math.abs(offer.grams - want.grams) / want.grams <= 0.15;
  return true;
}
