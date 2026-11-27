import { AGENT_WALLET, CELO, REPO_URL, TEAM, TRACKS, addrUrl, short } from "@/lib/bhav";
import CopyButton from "./CopyButton";
import Reveal from "./Reveal";
import { ArrowOut, GitHubIcon } from "./Stickers";

export const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

/** The Bhav logo: price-tag mark + die-cut wordmark (public/brand). */
export function Logo({ className = "h-10 w-auto md:h-11" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/bhav-logo.svg" alt="Bhav" width={945} height={290} className={className} />;
}

/** A section: big heading with a sticker label above it, an optional lead, then content. */
export function Section({
  id,
  kicker,
  title,
  lead,
  children,
  className = "",
  tone = "paper",
}: {
  id: string;
  kicker: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "paper" | "mandi";
}) {
  const dark = tone === "mandi";
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={`mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 ${className}`}>
      <Reveal>
        <p
          className={`inline-block -rotate-2 rounded-lg border-2 border-ink px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest shadow-[0_3px_0_var(--color-ink)] ${
            dark ? "bg-turmeric text-ink" : "bg-mint text-ink"
          }`}
        >
          {kicker}
        </p>
        <h2 id={`${id}-h`} className={`display mt-4 max-w-3xl text-[2.6rem] text-balance md:text-[4.2rem] ${dark ? "text-on-mandi" : "text-ink"}`}>
          {title}
        </h2>
        {lead && (
          <p className={`mt-4 max-w-2xl text-lg text-pretty md:text-xl ${dark ? "text-on-mandi/80" : "text-muted"}`}>{lead}</p>
        )}
      </Reveal>
      <div className="mt-10 md:mt-12">{children}</div>
    </section>
  );
}

/** A link to proof on Celoscan / GitHub, as a small sticker chip. */
export function ProofLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} {...ext} className="chip tap text-ink">
      {children}
      <ArrowOut className="size-3.5 shrink-0" />
    </a>
  );
}

const NAV: [string, string][] = [
  ["#try", "Try it"],
  ["#gate", "The gate"],
  ["#pay", "Pay"],
  ["#agent", "Agent"],
  ["#live", "Live"],
  ["#use", "For agents"],
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 md:h-[4.5rem]">
        <a href="#top" aria-label="Bhav, back to top" className="tap -ml-1 rounded-xl p-1 transition-transform hover:-rotate-2">
          <Logo className="h-9 w-auto md:h-11" />
        </a>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          {NAV.map(([h, l]) => (
            <a
              key={h}
              href={h}
              className="hidden rounded-full px-3 py-1.5 font-semibold text-ink/80 transition-colors hover:bg-turmeric/60 hover:text-ink lg:block"
            >
              {l}
            </a>
          ))}
          <a href={REPO_URL} {...ext} className="pill tap ml-2 bg-saffron px-4 py-2 text-sm text-ink">
            <GitHubIcon className="size-4" />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  const links: [string, string][] = [
    ["GitHub", REPO_URL],
    ["AGENTS.md", `${REPO_URL}/blob/main/AGENTS.md`],
    ["Agent wallet on Celoscan", addrUrl(AGENT_WALLET)],
    ["Celo", "https://celo.org"],
    ["Self", "https://self.xyz"],
    ["Agent Vault", "https://agentvault.io"],
  ];
  return (
    <footer className="dots-light border-t-2 border-ink bg-mandi text-on-mandi">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 pb-[max(3.5rem,env(safe-area-inset-bottom))] sm:px-6 md:grid-cols-[1.2fr_1fr] md:items-end">
        <div>
          <Logo className="h-14 w-auto md:h-16" />
          <p className="display mt-6 text-4xl md:text-5xl">
            know the bhav.
            <br />
            <span className="text-turmeric">pay the bhav.</span>
          </p>
          <p className="mt-5 max-w-md text-sm text-on-mandi/75">
            <span lang="hi" className="deva font-bold">
              भाव
            </span>{" "}
            means price, as in the market rate. Prices are for Kochi only. Built for Celo&apos;s Agents Open for Business
            hackathon, tracks: {TRACKS.map((t) => t.name.split(":")[0]).join(" and ")}.
          </p>
        </div>
        <div className="md:text-right">
          <p className="text-sm">
            Built by{" "}
            {TEAM.map((m) => (
              <a key={m.name} href={m.github} {...ext} className="font-bold text-turmeric underline-offset-4 hover:underline">
                {m.name}
              </a>
            ))}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm md:justify-end">
            {links.map(([l, h]) => (
              <li key={l}>
                <a href={h} {...ext} className="text-on-mandi/75 underline-offset-4 hover:text-on-mandi hover:underline">
                  {l}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-on-mandi/60">
            MIT licensed · {CELO.name} (chain {CELO.id})
          </p>
          <div className="mt-3 flex items-center gap-2 md:justify-end">
            <code className="font-mono text-xs text-on-mandi/70">{short(AGENT_WALLET, 10, 6)}</code>
            <CopyButton text={AGENT_WALLET} label="Copy address" tone="dark" />
          </div>
        </div>
      </div>
    </footer>
  );
}
