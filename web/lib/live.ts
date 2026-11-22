// Live, read-only facts from Celo mainnet. Runs on the server (one cached read shared by
// every visitor), revalidated about every 60 s. Never throws: a failed read comes back as
// null and the UI says so.
import { cacheLife } from "next/cache";
import { createPublicClient, http, pad, parseAbi } from "viem";
import { celo } from "viem/chains";
import { AGENT_WALLET, CELO, ERC8004, SELF } from "./bhav";

export type CeloFacts = {
  fetchedAt: string; // ISO
  txCount: number | null;
  erc8004Owner: string | null;
  selfVerified: boolean | null;
};

const client = createPublicClient({
  chain: celo,
  transport: http(CELO.rpc, { timeout: 8000, retryCount: 1 }),
});

const ownerAbi = parseAbi(["function ownerOf(uint256 tokenId) view returns (address)"]);
const selfAbi = parseAbi(["function isVerifiedAgent(bytes32 agentKey) view returns (bool)"]);

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

export async function getCeloFacts(): Promise<CeloFacts> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 900 });
  const [txCount, erc8004Owner, selfVerified] = await Promise.all([
    safe(client.getTransactionCount({ address: AGENT_WALLET })),
    safe(
      client.readContract({
        address: ERC8004.registry,
        abi: ownerAbi,
        functionName: "ownerOf",
        args: [ERC8004.agentId],
      }),
    ),
    safe(
      client.readContract({
        address: SELF.registry,
        abi: selfAbi,
        functionName: "isVerifiedAgent",
        // Self keys an agent by its address, left-padded to 32 bytes.
        args: [pad(AGENT_WALLET, { size: 32 })],
      }),
    ),
  ]);
  return {
    fetchedAt: new Date().toISOString(),
    txCount,
    erc8004Owner: erc8004Owner ?? null,
    selfVerified,
  };
}

// ---------------------------------------------------------------------------
// x402 payment stats: NOT BUILT YET. The price service and its x402 payments are
// still being built, so there is no data source. When it exists, return real
// numbers from here (e.g. paid answers, USDC received, unique humans served) and
// render them in app/components/X402Stats.tsx. Until then this returns null and
// the UI shows a "coming" card, never a made-up number.
// ---------------------------------------------------------------------------
export type X402Stats = {
  paidAnswers: number;
  usdcReceived: number;
  uniqueHumans: number;
};

export async function getX402Stats(): Promise<X402Stats | null> {
  return null; // data source TBD
}
