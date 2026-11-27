// Every public fact the site shows, in one place. Nothing secret lives here.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bhav.vercel.app";
export const REPO_URL = "https://github.com/nikhil-pn/bhav";
export const AGENTS_MD_URL = `${REPO_URL}/blob/main/AGENTS.md`;
export const SELF_DOCS_URL = "https://docs.self.xyz/docs/agent-id/overview";

/** Bhav's public price API. CORS is open for GET, so the browser calls it directly. */
export const API_BASE = (process.env.NEXT_PUBLIC_BHAV_API || "https://devbox.tail84790b.ts.net").replace(/\/+$/, "");
/** The public URL we tell agent builders to use (always the public one, never a local override). */
export const PUBLIC_API = "https://devbox.tail84790b.ts.net";
export const PRICE_USDC = "$0.01";
export const FREE_PER_DAY = 3;

export const CELO = {
  id: 42220,
  name: "Celo mainnet",
  rpc: "https://forno.celo.org",
  explorer: "https://celoscan.io",
} as const;

export const AGENT_WALLET = "0x33A80697Ac038279ca8d70F4c2Cef82672683b9F" as const;
export const ATTRIBUTION_TAG = "celo_bc5d483f879e";

export const ERC8004 = {
  registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const,
  agentId: 10088n,
  tx: "0xd041f1b77e5a7d1791dc0c3e4e6158cb3a4c44f2c4471d5e2c5d4c3c34d1bab4",
};

export const SELF = {
  registry: "0xaC3DF9ABf80d0F5c020C06B04Cced27763355944" as const,
  agentId: 211,
  tx: "0x37226569553840e5e0afbbf2f62af16a2e6530c2b0eb79174beafde4ec51b71b",
};

/** The household buyer agent we run ourselves: a second Self Agent ID, the first x402 payer. */
export const BUYER = {
  address: "0x964F176C16f484C4D035b3958a20F5F648897334" as const,
  selfAgentId: 212,
};
export const FIRST_X402_TX = "0x6113bb79235a96b96b362d88002cb4eec62a2d1a59f68db9cb9d2ce7b37b7090";

/** Agent Vault (Self Labs): the household agent's wallet and card, on Celo mainnet. */
export const VAULT = {
  wallet: "0x2e55fee82b78ad14467603efd389dfe9dd3c571e",
  firstBuyPaymentTx: "0x0bd4abc98ef89a65f0f6dee4e2d075d887a393204ea64b3ec5b45a805167cef4",
  capRefusalProof: `${REPO_URL}/blob/main/docs/proof/agent-vault-cap-refusal.png`,
  limits: { perPayment: "$0.02", weekly: "$0.10", monthly: "$0.20" },
} as const;

export const HACKATHON = {
  name: "Agents Open for Business",
  host: "Celo",
  venue: "Loops House",
  deadline: "7 Dec 2026",
};

export const TRACKS = [
  { name: "Self Agent ID: Verified Agent Payments", sponsor: "Self" },
  { name: "Agent Vault: Online & Onchain Checkouts", sponsor: "Self" },
] as const;

export const PRICE_RECORDS = "600,000+";
export const TRACKING_SINCE = "July 2026";

export const TEAM = [
  {
    name: "Nikhil P N",
    role: "builder",
    github: "https://github.com/nikhil-pn",
    x: "https://x.com/nikhileth",
    handle: "nikhileth",
  },
];

export const txUrl = (h: string) => `${CELO.explorer}/tx/${h}`;
export const addrUrl = (a: string) => `${CELO.explorer}/address/${a}`;
export const short = (s: string, a = 6, b = 4) => (s.length > a + b + 1 ? `${s.slice(0, a)}…${s.slice(-b)}` : s);
