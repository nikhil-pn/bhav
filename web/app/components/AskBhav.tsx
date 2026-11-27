"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE, FREE_PER_DAY, PRICE_USDC } from "@/lib/bhav";
import { type DemoAnswer, type Offer, perLabel, rupee, storeName, verdictLabel } from "@/lib/api";
import { ArrowOut } from "./Stickers";

const CHIPS = ["chicken curry cut", "eggs 30", "milk 1 litre", "onion 1kg"];

type State =
  | { s: "idle" }
  | { s: "loading"; q: string; t0: number }
  | { s: "done"; q: string; data: DemoAnswer; at: number }
  | { s: "busy"; q: string; until: number; dayCap: boolean }
  | { s: "error"; q: string; msg: string };

export default function AskBhav() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<State>({ s: "idle" });
  const [now, setNow] = useState(0);
  const ctl = useRef<AbortController | null>(null);
  const autoRetried = useRef(false);

  // One ticking clock for the loading timer and the busy countdown.
  const ticking = st.s === "loading" || st.s === "busy";
  useEffect(() => {
    if (!ticking) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [ticking]);

  async function ask(raw: string, isRetry = false) {
    const item = raw.trim().slice(0, 60);
    if (!item) return;
    if (!isRetry) autoRetried.current = false;
    setQ(item);
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    const timer = setTimeout(() => c.abort(), 60_000);
    setSt({ s: "loading", q: item, t0: Date.now() });
    try {
      const r = await fetch(`${API_BASE}/v1/demo?q=${encodeURIComponent(item)}`, { signal: c.signal });
      const j = await r.json().catch(() => null);
      if (r.status === 429) {
        const wait = Number(j?.retryAfterMs) || 0;
        setSt({ s: "busy", q: item, until: Date.now() + wait, dayCap: wait <= 0 });
      } else if (!r.ok || !j || typeof j.answer !== "string") {
        setSt({
          s: "error",
          q: item,
          msg:
            j?.error === "price_lookup_failed"
              ? "The stores didn't answer in time. Try again in a few seconds."
              : "Bhav couldn't answer that one. Try another item.",
        });
      } else {
        setSt({ s: "done", q: item, data: { ...j, offers: Array.isArray(j.offers) ? j.offers : [] }, at: Date.now() });
      }
    } catch {
      if (c.signal.aborted && ctl.current !== c) return; // superseded by a newer ask
      setSt({
        s: "error",
        q: item,
        msg: c.signal.aborted
          ? "That took too long. The stores may be slow right now; try again."
          : "Bhav's API isn't reachable right now. Please try again in a minute.",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  // When the demo lane frees up, retry once by itself.
  const left = st.s === "busy" ? Math.max(0, Math.ceil((st.until - now) / 1000)) : 0;
  useEffect(() => {
    if (st.s === "busy" && !st.dayCap && now > 0 && now >= st.until && !autoRetried.current) {
      autoRetried.current = true;
      ask(st.q, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st, now]);

  const loading = st.s === "loading";

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex gap-2 rounded-2xl border-[2.5px] border-ink bg-white p-2 shadow-[0_5px_0_var(--color-ink)] transition-shadow focus-within:shadow-[0_5px_0_var(--color-saffron)]"
      >
        <label htmlFor="ask-q" className="sr-only">
          What do you want to buy?
        </label>
        <input
          id="ask-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={60}
          placeholder="e.g. 1kg chicken curry cut"
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent px-2 text-base text-ink placeholder:text-muted/70 focus:outline-none sm:px-3 sm:text-lg"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="tap shrink-0 rounded-xl border-2 border-ink bg-saffron px-4 py-3 font-bold text-ink transition-colors hover:bg-turmeric disabled:opacity-50 disabled:hover:bg-saffron sm:px-6"
        >
          {loading ? "Asking…" : "Ask Bhav"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Try one of these">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={loading}
            onClick={() => ask(c)}
            className="tap rounded-full border-2 border-ink bg-paper px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-turmeric disabled:opacity-50"
          >
            {c}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-busy={loading} className="mt-6">
        {st.s === "loading" && <Loading q={st.q} secs={Math.max(0, Math.floor((now - st.t0) / 1000))} />}
        {st.s === "busy" && (
          <Notice tone="wait">
            {st.dayCap ? (
              <>The website demo has used up today&apos;s answers. Agents can still ask at <code>/v1/quote</code>.</>
            ) : left > 0 ? (
              <>
                Someone else just asked, and the free demo answers one question at a time. Asking for{" "}
                <b>“{st.q}”</b> in <b className="tabular-nums">{left} s</b>…
              </>
            ) : (
              <>
                Still busy.{" "}
                <button type="button" onClick={() => ask(st.q)} className="font-bold text-saffron-deep underline underline-offset-4">
                  Try “{st.q}” again
                </button>
              </>
            )}
          </Notice>
        )}
        {st.s === "error" && (
          <Notice tone="error">
            {st.msg}{" "}
            <button type="button" onClick={() => ask(st.q)} className="font-bold text-saffron-deep underline underline-offset-4">
              Retry
            </button>
          </Notice>
        )}
        {st.s === "done" && <Receipt q={st.q} d={st.data} at={st.at} />}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Website demo: free, and the slow lane. Agents get it at <code className="font-semibold text-ink">/v1/quote</code> with a Self
        Agent ID: {FREE_PER_DAY} free a day per human, then {PRICE_USDC} USDC over x402.
      </p>
    </div>
  );
}

function Notice({ tone, children }: { tone: "wait" | "error"; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-2xl border-2 p-4 text-sm leading-relaxed ${
        tone === "wait" ? "border-ink bg-turmeric/40" : "border-ink bg-white"
      }`}
    >
      {children}
    </div>
  );
}

function Loading({ q, secs }: { q: string; secs: number }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-white p-5">
      <p className="text-sm">
        Checking <b>Zepto</b>, <b>Blinkit</b> and <b>Instamart</b> for <b>“{q}”</b>…
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden>
        {["Zepto", "Blinkit", "Instamart"].map((s, i) => (
          <div key={s} className="overflow-hidden rounded-lg border-2 border-ink/15 bg-paper px-2 py-2 font-mono text-[11px] text-muted sm:px-3 sm:text-xs">
            {s}
            <div className="mt-2 h-1.5 overflow-hidden rounded bg-line">
              <div className="scan h-full w-1/3 rounded bg-saffron" style={{ animationDelay: `${i * 0.2}s` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-xs text-muted tabular-nums">
        {secs}s · live prices usually take 5–15 s{secs > 20 ? ", one store is slow today" : ""}
      </p>
    </div>
  );
}

function Chip({ o }: { o: Offer }) {
  const v = verdictLabel(o);
  const cls =
    v.tone === "deal"
      ? "bg-leaf text-white"
      : v.tone === "pricier"
        ? "bg-turmeric text-ink"
        : v.tone === "normal"
          ? "bg-ink/10 text-ink"
          : "border border-dashed border-ink/35 text-ink/60";
  return <span className={`inline-block whitespace-nowrap rounded px-1.5 py-px text-[10.5px] font-sans font-semibold ${cls}`}>{v.text}</span>;
}

const timeIST = (ms: number) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(ms);
const dateIST = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(Date.parse(iso));

function Receipt({ q, d, at }: { q: string; d: DemoAnswer; at: number }) {
  const best = d.best;
  const others = d.offers.filter((o) => !best || o.url !== best.url || o.name !== best.name).slice(0, 5);
  const errs = Object.entries(d.errors ?? {});
  return (
    <figure className="receipt w-full rounded-t-xl border-x-2 border-t-2 border-ink p-5 font-mono text-[12.5px] sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="display text-2xl text-saffron-deep">bhav</span>
        <span className="text-[11px] text-ink/60">Kochi · {timeIST(at)} IST</span>
      </div>
      <p className="mt-1 text-[11px] uppercase tracking-widest text-ink/60">you asked: {q}</p>
      <div className="my-4 border-t border-dashed border-ink/30" />

      <p className="font-sans text-[15px] leading-snug text-pretty">{d.answer}</p>

      {best && (
        <div className="mt-4 rounded-lg bg-ink/[0.06] p-3">
          <p className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-widest text-ink/60">
            <span>cheapest now</span>
            <span>{storeName(best.platform)}</span>
          </p>
          <p className="mt-1 font-sans text-[15px] font-semibold leading-snug">{best.name}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-lg font-bold">{rupee(best.price)}</span>
            {best.mrp != null && best.mrp > best.price && <s className="text-ink/50">{rupee(best.mrp)}</s>}
            {best.pack && <span className="text-ink/70">{best.pack}</span>}
            {perLabel(best, d.by) && <span className="text-ink/70">{perLabel(best, d.by)}</span>}
            <Chip o={best} />
          </p>
          {best.deal?.typical != null && (
            <p className="mt-1 text-[11px] text-ink/60">
              usual {rupee(best.deal.typical)}
              {best.deal.allTimeLow && ` · lowest ${rupee(best.deal.allTimeLow.price)} on ${dateIST(best.deal.allTimeLow.date)}`}
            </p>
          )}
          {best.url && (
            <a href={best.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-sans text-[13px] font-semibold underline underline-offset-4">
              Open in {storeName(best.platform)} <ArrowOut className="inline size-3.5" />
            </a>
          )}
        </div>
      )}

      {others.length > 0 && (
        <>
          <p className="mt-5 text-[11px] uppercase tracking-widest text-ink/60">other offers</p>
          <ul className="mt-2 divide-y divide-dashed divide-ink/20">
            {others.map((o, i) => (
              <li key={`${o.platform}-${o.id ?? i}`} className="py-2">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{storeName(o.platform)}</span> <span className="text-ink/70">{o.name}</span>
                  </span>
                  <span className="shrink-0 font-bold">{rupee(o.price)}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11.5px] text-ink/65">
                  <span>
                    {[o.pack, perLabel(o, d.by), o.inStock === false ? "out of stock" : null].filter(Boolean).join(" · ")}
                  </span>
                  <Chip o={o} />
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="my-4 border-t border-dashed border-ink/30" />
      <p className="text-[11px] leading-relaxed text-ink/60">
        {d.scanned != null && `${d.scanned} products scanned · ${d.matched ?? 0} matched`}
        {d.historyAsOf && ` · usual prices from our tracker, to ${dateIST(d.historyAsOf)}`}
      </p>
      {errs.length > 0 && (
        <p className="mt-1 text-[11px] leading-relaxed text-ink/60">
          {errs.map(([p]) => `${storeName(p)} didn't answer this time`).join(" · ")}
        </p>
      )}
      <p aria-hidden className="mt-3 overflow-hidden whitespace-nowrap text-center text-3xl leading-none tracking-[-0.12em] text-ink/80">
        ||| || ||| | |||| || ||| || |
      </p>
      <figcaption className="mt-1 text-center text-[10.5px] text-ink/55">live prices · free website demo</figcaption>
    </figure>
  );
}
