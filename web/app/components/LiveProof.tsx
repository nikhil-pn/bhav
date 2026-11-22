import { getCeloFacts } from "@/lib/live";
import { AGENT_WALLET, ERC8004, SELF, addrUrl, short, txUrl } from "@/lib/bhav";
import TimeAgo from "./TimeAgo";

function Tile({
  label,
  value,
  sub,
  href,
  ok,
}: {
  label: string;
  value: string;
  sub: string;
  href: string;
  ok: boolean;
}) {
  return (
    <div className="card flex flex-col p-5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${ok ? "" : "text-muted"}`}>{value}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto pt-3 font-mono text-xs break-all text-lime underline-offset-2 hover:underline"
      >
        {sub} ↗
      </a>
    </div>
  );
}

export default async function LiveProof() {
  const f = await getCeloFacts();
  const ownerIsAgent = f.erc8004Owner?.toLowerCase() === AGENT_WALLET.toLowerCase();
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile
          label={`ERC-8004 agent #${ERC8004.agentId} is owned by`}
          value={
            f.erc8004Owner == null
              ? "couldn't read"
              : ownerIsAgent
                ? "Bhav's wallet ✓"
                : short(f.erc8004Owner)
          }
          ok={f.erc8004Owner != null}
          sub={`ownerOf(${ERC8004.agentId}) · ${short(ERC8004.registry)}`}
          href={addrUrl(ERC8004.registry)}
        />
        <Tile
          label={`Self Agent ID #${SELF.agentId}: real human behind it?`}
          value={f.selfVerified == null ? "couldn't read" : f.selfVerified ? "yes, verified ✓" : "not verified"}
          ok={f.selfVerified != null}
          sub={`isVerifiedAgent · ${short(SELF.registry)}`}
          href={addrUrl(SELF.registry)}
        />
        <Tile
          label="Transactions sent by the agent wallet"
          value={f.txCount == null ? "couldn't read" : f.txCount.toLocaleString("en-US")}
          ok={f.txCount != null}
          sub={short(AGENT_WALLET, 8, 6)}
          href={addrUrl(AGENT_WALLET)}
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        Read straight from Celo mainnet through <code>forno.celo.org</code> with viem, cached for about 60 s, updated{" "}
        <TimeAgo ms={Date.parse(f.fetchedAt)} />. If a read fails, the tile says so rather than guessing. Registration
        transactions:{" "}
        <a href={txUrl(ERC8004.tx)} target="_blank" rel="noopener noreferrer" className="text-lime underline-offset-2 hover:underline">
          ERC-8004 {short(ERC8004.tx, 8, 4)}
        </a>{" "}
        ·{" "}
        <a href={txUrl(SELF.tx)} target="_blank" rel="noopener noreferrer" className="text-lime underline-offset-2 hover:underline">
          Self {short(SELF.tx, 8, 4)}
        </a>
      </p>
    </div>
  );
}

export function LiveProofSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading live Celo data">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-[124px] animate-pulse p-5">
            <div className="h-3 w-32 rounded bg-line" />
            <div className="mt-3 h-6 w-24 rounded bg-line" />
          </div>
        ))}
      </div>
    </div>
  );
}
