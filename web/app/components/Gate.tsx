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

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={knock}
        disabled={busy}
        className="tap rounded-full bg-lime px-6 py-3.5 font-semibold text-ink disabled:opacity-60"
      >
        {busy ? "Knocking…" : "Ask without a human behind you"}
      </button>
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-ink">
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="ml-2 font-mono text-[11px] text-muted">a bot with no Self Agent ID</span>
        </div>
        <div aria-live="polite" className="overflow-x-auto p-4 font-mono text-[12.5px] leading-6">
          <p className="break-all text-muted">
            <span className="text-lime">$</span> curl -i {PUBLIC_API.replace("https://", "")}/v1/quote?q=eggs
          </p>
          {!res && !busy && <p className="mt-2 text-muted">Press the button: this is a live request, not a recording.</p>}
          {busy && <p className="mt-2 text-muted">…</p>}
          {res && "error" in res && <p className="mt-2 text-mustard">{res.error}</p>}
          {res && "status" in res && (
            <>
              <p className={`mt-2 ${res.status === 403 ? "text-mustard" : "text-lime"}`}>
                HTTP/1.1 {res.status} {res.statusText} <span className="text-muted">· {res.ms} ms</span>
              </p>
              <pre className="mt-1 whitespace-pre-wrap break-words text-fg/90">{res.body}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
