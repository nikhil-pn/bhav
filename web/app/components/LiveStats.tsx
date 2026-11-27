"use client";

import { useEffect, useState } from "react";
import { API_BASE, txUrl, short } from "@/lib/bhav";
import { type Stats, isStats, reasonLabel } from "@/lib/api";
import TimeAgo from "./TimeAgo";
import { ArrowOut } from "./Stickers";

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
  const tiles: [string, string, string][] = [
    [t ? t.agentAnswers.toLocaleString("en-US") : "–", "answers to agents", "bg-white"],
    [t ? t.paid.toLocaleString("en-US") : "–", "paid over x402", "bg-turmeric"],
    [t ? `$${t.usdcEarned.toFixed(2)}` : "–", "USDC earned on Celo", "bg-mint"],
    [t ? t.refused.toLocaleString("en-US") : "–", "bots refused", "bg-[#ffd9cf]"],
    [t ? t.humans.toLocaleString("en-US") : "–", "humans served", "bg-white"],
  ];
  const countries = Object.entries(t?.humansByCountry ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <p className="mb-4 flex items-center gap-2 font-mono text-xs text-muted">
        <span aria-hidden className={`size-2.5 rounded-full ${online ? "live-dot bg-leaf" : "bg-turmeric"}`} />
        {online ? "live · refreshes every 20 s" : stats ? "API offline · showing the last numbers we saw" : "API offline right now"}
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([v, l, bg], i) => (
          <div
            key={l}
            className={`sticker-card flex flex-col-reverse p-4 md:p-5 ${bg} ${i === tiles.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <dt className="mt-1 text-xs font-semibold text-ink/70">{l}</dt>
            <dd className={`display text-3xl tabular-nums md:text-4xl ${t ? "text-ink" : "text-muted"}`}>{v}</dd>
          </div>
        ))}
      </dl>

      {countries.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">Humans by country (from Self):</span>
          {countries.map(([c, n]) => (
            <span key={c} className="rounded-full border-2 border-ink bg-white px-2.5 py-0.5 font-mono text-xs font-bold">
              {c} {n}
            </span>
          ))}
          {t?.adultHumans != null && <span className="text-muted">· {t.adultHumans} proved they are adults</span>}
        </p>
      )}

      <div className="sticker-card mt-5 p-5">
        <p className="font-bold">Recent activity</p>
        {!stats || stats.recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{stats ? "Nothing yet." : "Activity shows up here when the API is reachable."}</p>
        ) : (
          <ul className="mt-3 divide-y-2 divide-dashed divide-line">
            {stats.recent.slice(0, 6).map((e, i) => (
              <li
                key={`${e.ts}-${i}`}
                className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-baseline gap-x-3 py-2.5 text-sm sm:grid-cols-[4.25rem_minmax(0,1fr)_auto]"
              >
                <Kind k={e.kind} />
                <span className="min-w-0 break-words">
                  {e.kind === "refused" ? (
                    <span className="text-muted">Turned away: {reasonLabel(e.reason)}</span>
                  ) : (
                    <>
                      <span className="font-semibold">“{e.q}”</span>
                      <span className="text-muted"> for Self agent #{e.agentId}</span>
                    </>
                  )}
                </span>
                <span className="col-start-2 mt-0.5 flex flex-wrap gap-x-3 font-mono text-xs text-muted sm:col-start-3 sm:mt-0 sm:justify-end">
                  {e.tx && (
                    <a
                      href={txUrl(e.tx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-bold text-saffron-deep underline-offset-2 hover:underline"
                    >
                      tx {short(e.tx, 6, 4)} <ArrowOut className="size-3" />
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
      ? "border-2 border-ink bg-leaf text-white"
      : k === "free"
        ? "border-2 border-ink bg-mint text-ink"
        : "border-2 border-dashed border-chilli text-chilli";
  return <span className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center font-mono text-[11px] font-bold ${cls}`}>{k}</span>;
}

export function LiveStatsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading live stats">
      <div className="mb-4 h-4 w-48 rounded bg-line" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="sticker-card h-[92px] animate-pulse p-5" />
        ))}
      </div>
    </div>
  );
}
