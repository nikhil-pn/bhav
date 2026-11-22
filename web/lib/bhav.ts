// Every public fact the site shows, in one place. Nothing secret lives here.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bhav.vercel.app";
export const REPO_URL = "https://github.com/nikhil-pn/bhav";

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
