"use client";

import { useState } from "react";
import { Check, CopyIcon } from "./Stickers";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older in-app browsers: fall back to a hidden textarea.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

export default function CopyButton({
  text,
  label = "Copy",
  className = "",
  "aria-label": ariaLabel,
  tone = "light",
}: {
  text: string;
  label?: string;
  className?: string;
  "aria-label"?: string;
  tone?: "light" | "dark";
}) {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(text);
        setState(ok ? "ok" : "err");
        setTimeout(() => setState("idle"), 1600);
      }}
      className={`tap inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 px-2.5 py-1.5 text-xs font-bold transition-colors ${
        tone === "dark"
          ? "border-on-mandi/40 bg-white/5 text-on-mandi hover:border-turmeric hover:text-turmeric"
          : "border-ink bg-white text-ink shadow-[0_2px_0_var(--color-ink)] hover:bg-turmeric"
      } ${className}`}
      aria-label={state === "idle" ? ariaLabel : undefined}
      aria-live="polite"
    >
      {state === "ok" ? <Check className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      {state === "ok" ? "Copied" : state === "err" ? "Copy failed" : label}
    </button>
  );
}
