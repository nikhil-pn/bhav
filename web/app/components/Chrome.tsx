import Link from "next/link";
import { AGENT_WALLET, CELO, REPO_URL, TEAM, TRACKING_SINCE, TRACKS, addrUrl, short } from "@/lib/bhav";
import CopyButton from "./CopyButton";

export const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-baseline gap-2 ${className}`}>
      <span className="serif-i text-3xl text-lime">bhav</span>
      <span lang="hi" className="text-sm text-muted">
        भाव
      </span>
    </span>
  );
}

export function Title({ i, rest, as: As = "h2" }: { i: string; rest: React.ReactNode; as?: "h1" | "h2" }) {
  return (
    <As className="display text-[2.8rem] text-lime md:text-[4.5rem]">
      <span className="serif-i">{i}</span> {rest}
    </As>
  );
}

export function Section({
  id,
  i,
  rest,
  lead,
  children,
  className = "",
}: {
  id: string;
  i: string;
  rest: React.ReactNode;
  lead?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={`mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 md:py-28 ${className}`}>
      <div id={`${id}-h`}>
        <Title i={i} rest={rest} />
      </div>
      {lead && <p className="mt-5 max-w-xl text-lg text-pretty text-muted">{lead}</p>}
      <div className="mt-12">{children}</div>
    </section>
  );
}

/** A small "live" / "coming" label. Never use "live" for something that isn't. */
export function Status({ live, children }: { live: boolean; children?: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] ${
        live ? "bg-lime/15 text-lime" : "border border-dashed border-mustard/60 text-mustard"
      }`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${live ? "bg-lime" : "bg-mustard"}`} />
      {children ?? (live ? "live" : "being built")}
    </span>
  );
}

export function Header({ home = true }: { home?: boolean }) {
  const p = home ? "" : "/";
  return (
    <header className="fixed inset-x-0 top-0 z-30 bg-bg/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-5">
        <Link href="/" aria-label="Bhav, home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          {[
            [`${p}#try`, "Try it"],
            [`${p}#gate`, "The gate"],
            [`${p}#live`, "Live"],
            [`${p}#use`, "For agents"],
            ["/how-it-works", "How it works"],
          ].map(([h, l]) => (
            <a key={h} href={h} className="hidden rounded-full px-3 py-1.5 text-fg/80 hover:text-fg md:block">
              {l}
            </a>
          ))}
          <a href={REPO_URL} {...ext} className="tap rounded-full bg-lime px-4 py-1.5 font-semibold text-ink">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  const links: [string, string][] = [
    ["How it works", "/how-it-works"],
    ["GitHub", REPO_URL],
    ["Agent wallet on Celoscan", addrUrl(AGENT_WALLET)],
    ["Celo", "https://celo.org"],
    ["Self", "https://self.xyz"],
  ];
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 pb-[max(3.5rem,env(safe-area-inset-bottom))] sm:px-5 md:grid-cols-[1.2fr_1fr] md:items-end">
        <div>
          <p className="display text-6xl text-lime">
            <span className="serif-i">know</span> the bhav.
            <br />
            pay the bhav.
          </p>
          <p className="mt-6 max-w-md text-sm text-muted">
            Prices: Kochi only. Price history collected by our own tracker since {TRACKING_SINCE}. Built for Celo&apos;s
            Agents Open for Business hackathon, tracks: {TRACKS.map((t) => t.name.split(":")[0]).join(" and ")}. Site
            design adapted from our Iva site.
          </p>
        </div>
        <div className="md:text-right">
          <p className="text-sm">
            Built by{" "}
            {TEAM.map((m) => (
              <a key={m.name} href={m.github} {...ext} className="font-semibold text-lime underline-offset-4 hover:underline">
                {m.name}
              </a>
            ))}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm md:justify-end">
            {links.map(([l, h]) => (
              <li key={l}>
                <a
                  href={h}
                  {...(h.startsWith("/") ? {} : ext)}
                  className="text-muted underline-offset-4 hover:text-fg hover:underline"
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">MIT licensed · {CELO.name} (chain {CELO.id})</p>
          <div className="mt-3 flex items-center gap-2 md:justify-end">
            <code className="font-mono text-xs text-muted">{short(AGENT_WALLET, 10, 6)}</code>
            <CopyButton text={AGENT_WALLET} label="Copy address" />
          </div>
        </div>
      </div>
    </footer>
  );
}
