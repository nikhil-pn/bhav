// "Works with" strip. Third-party marks come from official sources (public/brand/partners/CREDITS.txt)
// and are only shown in one colour, never redrawn.
const PARTNERS: { name: string; src: string; w: number; h: number; role: string; href: string; text?: string }[] = [
  { name: "Celo", src: "/brand/partners/celo.svg", w: 110, h: 25, role: "payments settle here", href: "https://celo.org" },
  { name: "Self", src: "/brand/partners/self.svg", w: 192, h: 72, role: "a human behind each agent", href: "https://self.xyz" },
  {
    name: "Agent Vault",
    src: "/brand/partners/agent-vault.svg",
    w: 46,
    h: 46,
    role: "logins and a capped wallet",
    href: "https://agentvault.io",
    text: "Agent Vault",
  },
  { name: "x402", src: "/brand/partners/x402.svg", w: 486, h: 187, role: "pay per answer", href: "https://x402.org" },
  { name: "Instacart", src: "/brand/partners/instacart.svg", w: 150, h: 24, role: "store sign-in demo (US)", href: "https://www.instacart.com" },
];

export default function Partners() {
  return (
    <section aria-labelledby="works-h" className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 md:pt-16">
      <h2 id="works-h" className="text-center font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted">
        Works with
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PARTNERS.map((p, i) => (
          <li key={p.name} className={i === PARTNERS.length - 1 ? "col-span-2 sm:col-span-1" : ""}>
            <a
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="tap group flex h-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-ink/15 bg-white/60 px-3 py-4 transition-colors hover:border-ink hover:bg-white"
            >
              <span className="flex h-9 items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  alt={p.text ? "" : p.name}
                  width={p.w}
                  height={p.h}
                  loading="lazy"
                  className={`w-auto transition-transform group-hover:scale-105 ${p.name === "Instacart" ? "h-6" : "h-7"} ${p.name === "Agent Vault" ? "" : "brightness-0"}`}
                />
                {p.text && <span className="display text-xl tracking-tight">{p.text}</span>}
              </span>
              <span className="text-center text-xs text-muted">{p.role}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
