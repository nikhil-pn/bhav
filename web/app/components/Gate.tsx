"use client";

import { useState } from "react";
import { API_BASE, PUBLIC_API } from "@/lib/bhav";

type Res = { status: number; statusText: string; body: string; ms: number } | { error: string };

const STATUS_TEXT: Record<number, string> = { 200: "OK", 402: "Payment Required", 403: "Forbidden", 429: "Too Many Requests" };

export default function Gate() {
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);

  async function knock() {
    setBusy(true);
    const t0 = performance.now();
    try {
      const r = await fetch(`${API_BASE}/v1/quote?q=eggs`, { signal: AbortSignal.timeout(20_000) });
      const text = await r.text();
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
      setRes({ status: r.status, statusText: r.statusText || STATUS_TEXT[r.status] || "", body, ms: Math.round(performance.now() - t0) });
    } catch {
      setRes({ error: "Couldn't reach Bhav's API just now. Try again in a minute." });
    } finally {
      setBusy(false);
    }
  }

  const refused = !!res && "status" in res && res.status === 403;
  return (
    <div className="min-w-0">
      <button type="button" onClick={knock} disabled={busy} className="pill tap bg-chilli px-6 py-3.5 text-white">
        {busy ? "Knocking…" : "Ask without a human behind you"}
      </button>
      <div className="relative mt-5 overflow-hidden rounded-2xl border-[2.5px] border-ink bg-ink shadow-[0_6px_0_var(--color-ink)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-chilli" />
          <span className="size-2.5 rounded-full bg-turmeric" />
          <span className="size-2.5 rounded-full bg-leaf" />
          <span className="ml-2 font-mono text-[11px] text-white/55">a bot with no Self Agent ID</span>
        </div>
        <div aria-live="polite" className="min-h-40 overflow-x-auto p-4 font-mono text-[12.5px] leading-6 text-white/90">
          <p className="break-all text-white/60">
            <span className="text-turmeric">$</span> curl -i {PUBLIC_API.replace("https://", "")}/v1/quote?q=eggs
          </p>
          {!res && !busy && <p className="mt-2 text-white/60">Press the button: this is a live request, not a recording.</p>}
          {busy && <p className="mt-2 text-white/60">…</p>}
          {res && "error" in res && <p className="mt-2 text-turmeric">{res.error}</p>}
          {res && "status" in res && (
            <>
              <p className={`mt-2 font-bold ${res.status === 403 ? "text-[#ff8f7d]" : "text-[#7df0a8]"}`}>
                HTTP/1.1 {res.status} {res.statusText} <span className="font-normal text-white/50">· {res.ms} ms</span>
              </p>
              <pre className="mt-1 whitespace-pre-wrap break-words">{res.body}</pre>
            </>
          )}
        </div>
        {refused && (
          <div
            aria-hidden
            className="stamp-in pointer-events-none absolute right-3 top-12 rounded-lg border-[3px] border-[#ff8f7d] px-3 py-1 font-mono text-lg font-black tracking-widest text-[#ff8f7d] md:right-6 md:text-2xl"
          >
            REFUSED
          </div>
        )}
      </div>
    </div>
  );
}
