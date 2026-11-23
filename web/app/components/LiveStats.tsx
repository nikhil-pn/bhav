"use client";

import { useEffect, useState } from "react";
import { API_BASE, txUrl, short } from "@/lib/bhav";
import { type Stats, isStats, reasonLabel } from "@/lib/api";
import TimeAgo from "./TimeAgo";

/** Live counters + activity feed from GET /v1/stats. Starts from the server snapshot, then refreshes every 20 s. */
export default function LiveStats({ initial }: { initial: Stats | null }) {
  const [stats, setStats] = useState<Stats | null>(initial);
  const [online, setOnline] = useState(initial != null);

  useEffect(() => {
    let alive = true;
    async function pull() {
      if (document.visibilityState === "hidden") return;
      try {
        const r = await fetch(`${API_BASE}/v1/stats`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
        const j: unknown = await r.json();
        if (!alive) return;
        if (r.ok && isStats(j)) {
          setStats(j);
          setOnline(true);
        } else setOnline(false);
      } catch {
        if (alive) setOnline(false);
      }
    }
    pull();
    const t = setInterval(pull, 20_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const t = stats?.totals;
  const tiles: [string, string][] = [
    [t ? t.agentAnswers.toLocaleString("en-US") : "–", "answers to agents"],
    [t ? t.paid.toLocaleString("en-US") : "–", "paid over x402"],
    [t ? `$${t.usdcEarned.toFixed(2)}` : "–", "USDC earned on Celo"],
    [t ? t.refused.toLocaleString("en-US") : "–", "bots refused"],
    [t ? t.humans.toLocaleString("en-US") : "–", "humans served"],
  ];

  return (
    <div>
      <p className="mb-4 flex items-center gap-2 font-mono text-xs text-muted">
        <span
          aria-hidden
          className={`size-2 rounded-full ${online ? "bg-lime shadow-[0_0_0_4px_rgb(126_216_84/0.18)]" : "bg-mustard"}`}
        />
        {online ? "live · refreshes every 20 s" : stats ? "API offline · showing the last numbers we saw" : "API offline right now"}
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([v, l], i) => (
          <div key={l} className={`card p-5 ${i === tiles.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
            <dd className={`text-3xl font-medium tracking-tight tabular-nums ${t ? "text-lime" : "text-muted"}`}>{v}</dd>
            <dt className="mt-1 text-xs text-muted">{l}</dt>
          </div>
        ))}
      </dl>

      <div className="card mt-4 p-5">
        <p className="text-sm font-semibold">Recent activity</p>
        {!stats || stats.recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{stats ? "Nothing yet." : "Activity shows up here when the API is reachable."}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {stats.recent.slice(0, 8).map((e, i) => (
              <li key={`${e.ts}-${i}`} className="grid grid-cols-[4rem_minmax(0,1fr)] items-baseline gap-x-3 py-2.5 text-sm sm:grid-cols-[4rem_minmax(0,1fr)_auto]">
                <Kind k={e.kind} />
                <span className="min-w-0">
                  {e.kind === "refused" ? (
                    <span className="text-muted">Turned away: {reasonLabel(e.reason)}</span>
                  ) : (
                    <>
                      <span className="text-fg">“{e.q}”</span>
                      <span className="text-muted"> for Self agent #{e.agentId}</span>
                    </>
                  )}
                </span>
                <span className="col-start-2 mt-0.5 flex flex-wrap gap-x-3 font-mono text-xs text-muted sm:col-start-3 sm:mt-0 sm:justify-end">
                  {e.tx && (
                    <a href={txUrl(e.tx)} target="_blank" rel="noopener noreferrer" className="text-lime underline-offset-2 hover:underline">
                      tx {short(e.tx, 6, 4)} ↗
                    </a>
                  )}
                  <TimeAgo ms={Date.parse(e.ts)} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kind({ k }: { k: string }) {
  const cls =
    k === "paid"
      ? "bg-lime text-ink"
      : k === "free"
        ? "bg-lime/15 text-lime"
        : "border border-dashed border-mustard/60 text-mustard";
  return <span className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center font-mono text-[11px] ${cls}`}>{k}</span>;
}

export function LiveStatsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading live stats">
      <div className="mb-4 h-4 w-48 rounded bg-line" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-[92px] animate-pulse p-5" />
        ))}
      </div>
    </div>
  );
}
