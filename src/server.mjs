// Bhav price service: grocery prices for agents that have a real human behind them.
// This file only wires the real parts together; the service itself is src/app.mjs.
//
// Env: X402_API_KEY, X402_NETWORK=testnet|mainnet, BHAV_PAY_TO, PORT, HOST, BHAV_FREE_PER_DAY,
//      BHAV_PRICE_ATOMIC, BHAV_DATA_DIR, BHAV_DEMO_GAP_MS, BHAV_DEMO_PER_DAY, BHAV_PRICES_MODULE.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SelfAgentVerifier } from '@selfxyz/agent-sdk';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { createApp, NETWORKS } from './app.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NET = process.env.X402_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
// Starts without secrets: the gate, free answers, the website demo, stats and the 402 price terms all work.
// Only settling a paid answer needs the facilitator key (X402_API_KEY). BHAV_PAY_TO is public: it defaults
// to Bhav's own agent wallet.
const PAY_TO = process.env.BHAV_PAY_TO || '0x33A80697Ac038279ca8d70F4c2Cef82672683b9F';
if (!process.env.X402_API_KEY) console.warn('X402_API_KEY not set: free answers and the gate work; paid answers cannot settle until it is set.');

// Humans are proven on Celo MAINNET (real passports / Aadhaar) even while payments are
// tested on Sepolia. sybilLimit(10) = the registry's own per-human cap; we still get the
// nullifier, which is what the quota is keyed on.
// includeCredentials(): read the human's disclosed age and nationality (src/app.mjs uses only those two).
const verifier = SelfAgentVerifier.create().network('mainnet').sybilLimit(10).includeCredentials().build();

const facilitator = new HTTPFacilitatorClient({
  url: NETWORKS[NET].facilitator,
  createAuthHeaders: async () => {
    const h = process.env.X402_API_KEY ? { 'X-API-Key': process.env.X402_API_KEY } : {};
    return { verify: h, settle: h, supported: h };
  },
});

let pricesMod;
async function quote(q) {
  pricesMod ||= await import(process.env.BHAV_PRICES_MODULE || './prices/index.mjs');
  return pricesMod.quote(q);
}

const app = createApp({
  net: NET,
  payTo: PAY_TO,
  verifier,
  facilitator,
  quote,
  dataDir: process.env.BHAV_DATA_DIR || join(ROOT, '.data'),
  priceAtomic: process.env.BHAV_PRICE_ATOMIC,
  freePerDay: process.env.BHAV_FREE_PER_DAY,
  demoGapMs: process.env.BHAV_DEMO_GAP_MS,
  demoPerDay: process.env.BHAV_DEMO_PER_DAY,
});

const port = Number(process.env.PORT || 3420);
app.listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log(`bhav on :${port} · x402 ${NET} (${NETWORKS[NET].caip}) · payTo ${PAY_TO} · ${process.env.BHAV_FREE_PER_DAY || 3} free/human/day`);
});
