#!/usr/bin/env node
// Print a live Bhav price quote as JSON.
// Usage: node scripts/prices-demo.mjs "chicken curry cut" ["eggs 30" ...]
// Several queries run one after another on the same warm browser.

import { quote, closeBrowser } from '../src/prices/index.mjs';

const queries = process.argv.slice(2);
if (!queries.length) {
  console.error('usage: node scripts/prices-demo.mjs "<query>" ["<query>" ...]');
  process.exit(2);
}

try {
  for (const q of queries) {
    const t0 = Date.now();
    const result = await quote(q);
    console.log(JSON.stringify({ ...result, totalMs: Date.now() - t0 }, null, 2));
  }
} finally {
  await closeBrowser();
}
