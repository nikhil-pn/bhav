import { Suspense } from "react";
import AskBhav from "./components/AskBhav";
import Gate from "./components/Gate";
import LiveStats, { LiveStatsSkeleton } from "./components/LiveStats";
import CopyButton from "./components/CopyButton";
import Partners from "./components/Partners";
import Reveal from "./components/Reveal";
import RunnerTrack from "./components/Runners";
import { Footer, Header, ProofLink, Section, ext } from "./components/Chrome";
import {
  AgentBot,
  ArrowDown,
  Banana,
  Coconut,
  Coin,
  GitHubIcon,
  Onion,
  PriceTag,
  RogueBot,
  Scale,
  Sparkle,
  StickerDefs,
  Vault,
} from "./components/Stickers";
import { getStats } from "@/lib/live";
import {
  AGENTS_MD_URL,
  BUYER,
  ERC8004,
  FIRST_X402_TX,
  FREE_PER_DAY,
  PRICE_USDC,
  PUBLIC_API,
  REPO_URL,
  SELF,
  SELF_DOCS_URL,
  TRACKING_SINCE,
  VAULT,
  addrUrl,
  txUrl,
} from "@/lib/bhav";

/** A sticker that pops in once, wiggles on hover and bobs while idle. */
function St({ at, delay = 0, children }: { at: string; delay?: number; children: React.ReactNode }) {
  return (
    <div className={`pop-in absolute ${at}`} style={{ animationDelay: `${delay}ms` }} aria-hidden>
      <div className="wiggle">{children}</div>
    </div>
  );
}

function Hero() {
  return (
    <section id="top" aria-labelledby="hero-h" className="mx-auto max-w-6xl px-3 pt-4 sm:px-6 md:pt-8">
      <div className="dots-light relative overflow-hidden rounded-[2rem] border-[3px] border-ink bg-mandi text-on-mandi shadow-[0_8px_0_var(--color-ink)] md:rounded-[2.75rem]">
        <div className="relative z-10 px-5 pb-2 pt-10 text-center sm:px-8 md:px-12 md:pt-16">
          <p className="fade-up inline-flex items-center gap-2 rounded-full border-2 border-on-mandi/30 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-on-mandi/80 md:text-xs">
            <span className="live-dot size-2 rounded-full bg-[#7df0a8]" aria-hidden />
            live on Celo mainnet
          </p>
          <h1 id="hero-h" className="display mx-auto mt-6 max-w-4xl text-[3.6rem] sm:text-[5rem] md:text-[7.5rem]">
            <span className="rise block" style={{ animationDelay: "100ms" }}>
              Know the
            </span>
            <span className="rise block text-turmeric" style={{ animationDelay: "240ms" }}>
              bhav.
            </span>
          </h1>
          <p className="fade-up mx-auto mt-5 max-w-xl text-pretty text-base text-on-mandi/85 md:text-xl" style={{ animationDelay: "450ms" }}>
            <span lang="hi" className="deva font-bold text-turmeric">
              भाव
            </span>{" "}
            means price. Bhav checks <b className="text-on-mandi">Zepto, Blinkit and Instamart</b> in Kochi live and sells the
            answer to AI agents, but only to agents with a real human behind them.
          </p>
          <div className="fade-up mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "600ms" }}>
            <a href="#try" className="pill tap bg-turmeric px-6 py-3 text-ink">
              Ask for a price
              <ArrowDown className="size-4" />
            </a>
            <a href="#use" className="pill tap bg-on-mandi px-6 py-3 text-ink">
              Use it from your agent
            </a>
          </div>
        </div>

        <RunnerTrack className="relative z-10 mx-auto mt-4 w-full max-w-5xl md:mt-2" />

        <St at="left-[4%] top-[14%] hidden md:block" delay={500}>
          <PriceTag className="swing w-36" />
        </St>
        <St at="right-[5%] top-[12%] hidden md:block" delay={650}>
          <Onion className="bob w-24 [--r:10deg]" />
        </St>
        <St at="left-[7%] top-[52%] hidden lg:block" delay={800}>
          <Coconut className="bob w-24 [--r:-8deg] [animation-delay:1.2s]" />
        </St>
        <St at="right-[7%] top-[48%] hidden lg:block" delay={950}>
          <Coin className="bob w-24 [--r:8deg] [animation-delay:2s]" />
        </St>
        <St at="-right-2 top-[6%] md:hidden" delay={600}>
          <PriceTag className="swing w-20" />
        </St>
        <Sparkle className="pointer-events-none absolute right-[28%] top-[8%] hidden w-8 md:block" />
        <Sparkle className="pointer-events-none absolute left-[20%] top-[34%] hidden w-6 lg:block" color="#ff7a1a" />
      </div>
    </section>
  );
}

const TICKER = [
  "Zepto",
  "Blinkit",
  "Instamart",
  "live prices in Kochi",
  `${FREE_PER_DAY} free answers a day per human`,
  `then ${PRICE_USDC} USDC`,
  "x402 on Celo",
  "Self Agent ID",
  "bots refused",
];

function Ticker() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {TICKER.map((t) => (
        <li key={t} className="flex items-center gap-5 pr-5 font-mono text-sm font-bold uppercase tracking-wider md:text-base">
          <span className="whitespace-nowrap">{t}</span>
          <Sparkle className="size-5 shrink-0" color="#fff6e3" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee-wrap mt-8 -rotate-1 overflow-hidden border-y-[3px] border-ink bg-saffron py-3 text-ink md:mt-10">
      <div className="marquee flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

function Try() {
  return (
    <Section
      id="try"
      kicker="Live demo"
      title={
        <>
          Ask Bhav <span className="text-saffron-deep">a price.</span>
        </>
      }
      lead="One question, three shops, checked right now and compared with our own price archive. This is the real service, not a recording."
    >
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start [&>*]:min-w-0">
        <AskBhav />
        <Reveal variant="pop" className="relative hidden md:block">
          <div className="sticker-card -rotate-2 bg-turmeric p-7">
            <p className="display text-3xl">What you get back</p>
            <ul className="mt-4 space-y-3 text-base">
              <li>The cheapest offer across the three apps, priced per kg or per piece.</li>
              <li>Whether it is a deal, normal, or pricier than that product&apos;s usual price (tracked since {TRACKING_SINCE}).</li>
              <li>A link to open it in the store.</li>
            </ul>
          </div>
          <div className="wiggle absolute -bottom-10 -right-4">
            <Scale className="bob w-32 [--r:6deg]" />
          </div>
          <div className="wiggle absolute -left-6 -top-10">
            <Banana className="bob w-24 [--r:-12deg] [animation-delay:1.4s]" />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function TheGate() {
  return (
    <Section
      id="gate"
      kicker="The gate"
      title={
        <>
          No human behind it? <span className="text-chilli">No answer.</span>
        </>
      }
      lead="Bhav only answers agents that sign their request with a Self Agent ID: a zero-knowledge proof that a real, unique person stands behind the agent, without saying who. Try being a bot:"
    >
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center [&>*]:min-w-0">
        <Gate />
        <Reveal variant="pop" className="flex items-center gap-5 md:flex-col md:text-center">
          <div className="wiggle shrink-0">
            <RogueBot className="bob w-24 [--r:-6deg] md:w-36" />
          </div>
          <p className="text-pretty text-muted md:max-w-xs">
            A request with no Self Agent ID gets <b className="text-ink">403 human_backed_agents_only</b>, and the refusal is
            counted in the live stats below.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}

function Pay() {
  const steps: { t: string; d: string; bg: string; art: React.ReactNode }[] = [
    {
      t: "Prove a human",
      d: "The agent signs each request with its Self Agent ID key. Bhav checks it against the Self registry on Celo.",
      bg: "bg-mint",
      art: <AgentBot className="w-20" />,
    },
    {
      t: `${FREE_PER_DAY} free a day, per human`,
      d: "The free answers belong to the person, not the agent. Ten agents from one human share one quota.",
      bg: "bg-white",
      art: <PriceTag label="free" className="w-24" />,
    },
    {
      t: `Then ${PRICE_USDC} USDC`,
      d: "The server answers 402 Payment Required. The agent pays in USDC on Celo over x402 and retries. No account, no API key.",
      bg: "bg-turmeric",
      art: <Coin className="w-20" />,
    },
  ];
  const flow: [string, string, string][] = [
    ["403", "human_backed_agents_only", "no Self Agent ID"],
    ["200", "answer", `signed, within ${FREE_PER_DAY} free a day`],
    ["402", `payment required: ${PRICE_USDC} USDC`, "signed, quota used"],
    ["200", "answer + settlement tx", "retried with the payment"],
  ];
  return (
    <Section
      id="pay"
      kicker="How it pays"
      title={
        <>
          Three free a day. <span className="text-saffron-deep">Then one cent.</span>
        </>
      }
    >
      <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal as="li" key={s.t} variant="tilt" delay={i * 90}>
            <div className={`sticker-card lift relative h-full p-6 pt-5 ${s.bg}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="display text-5xl text-ink/25" aria-hidden>
                  {i + 1}
                </span>
                <div className="-mt-6 -mr-2 rotate-6" aria-hidden>
                  {s.art}
                </div>
              </div>
              <p className="display mt-2 text-2xl">{s.t}</p>
              <p className="mt-2 text-ink/80">{s.d}</p>
            </div>
          </Reveal>
        ))}
      </ol>

      <Reveal className="mt-8 overflow-hidden rounded-2xl border-[2.5px] border-ink bg-ink p-4 font-mono text-[12.5px] leading-7 text-white/90 shadow-[0_6px_0_var(--color-ink)] md:p-5">
        <p className="mb-1 text-white/50"># what an agent sees, in order</p>
        {flow.map(([code, what, why], i) => (
          <p key={i} className="flex flex-wrap gap-x-3">
            <span className={`font-bold ${code === "200" ? "text-[#7df0a8]" : code === "402" ? "text-turmeric" : "text-[#ff8f7d]"}`}>
              {code}
            </span>
            <span>{what}</span>
            <span className="w-full pl-10 text-white/45 sm:w-auto sm:pl-0"># {why}</span>
          </p>
        ))}
      </Reveal>
    </Section>
  );
}

function Household() {
  const steps: { t: string; d: React.ReactNode; note: string; art: React.ReactNode }[] = [
    {
      t: "It proves a human is behind it.",
      d: <>The household agent signs every request with its Self Agent ID and asks Bhav for the cheapest price.</>,
      note: `Self Agent ID #${BUYER.selfAgentId}, ERC-8004 agent #${BUYER.erc8004AgentId}. Same person as Bhav's own agent, so one shared free quota.`,
      art: <AgentBot className="w-16" />,
    },
    {
      t: "It signs in without seeing the password.",
      d: (
        <>
          It signs in to a store account through Agent Vault, with a login the vault opened for it. The password was minted
          in the vault and nobody has seen it. A captcha or email code goes to the owner&apos;s phone, never to the agent.
        </>
      ),
      note: "Shown on instacart.com, the grocery site in Agent Vault's registry with a verified sign-in. Instacart serves the US, so this step shows the capability.",
      art: <Vault className="w-16" />,
    },
    {
      t: "It pays from a capped wallet.",
      d: (
        <>
          It pays {VAULT.lookupPrice} per Google Places lookup (open supermarkets nearby in Kochi) in USDC on Celo, from the
          owner&apos;s Agent Vault wallet, under an agent card the owner set.
        </>
      ),
      note: `Weekly grocery-research budget ${VAULT.limits.weekly}, at most ${VAULT.limits.perPayment} per payment. Two lookups paid.`,
      art: <Coin label={VAULT.lookupPrice} className="w-16" />,
    },
    {
      t: "It gets stopped.",
      d: <>The third lookup: &ldquo;Refused: over the weekly limit&rdquo;. Nothing is paid, and the card pauses until the owner resumes it.</>,
      note: "A hard limit the agent cannot talk its way past.",
      art: <RogueBot className="w-16" />,
    },
  ];
  const proof: [string, string][] = [
    [`Household agent: ERC-8004 #${BUYER.erc8004AgentId}`, txUrl(BUYER.erc8004Tx)],
    ["Agent Vault wallet", addrUrl(VAULT.wallet)],
    ["Lookup 1 paid", txUrl(VAULT.placesTxs[0])],
    ["Lookup 2 paid", txUrl(VAULT.placesTxs[1])],
    ["Lookup 3 refused (screenshot)", VAULT.capRefusalProof],
    ["Store sign-in (log)", VAULT.instacartSigninLog],
  ];
  return (
    <div className="dots-light border-y-[3px] border-ink bg-mandi">
      <Section
        id="agent"
        tone="mandi"
        kicker="The household agent"
        title={
          <>
            Its hands: <span className="text-turmeric">Agent Vault.</span>
          </>
        }
        lead="Bhav finds the price. The household agent acts on it through Agent Vault (by Self Labs): store passwords and the wallet key stay in the vault, and every payment is capped. Each step below ran on Celo mainnet."
      >
        <ol className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.t} variant="tilt" delay={(i % 2) * 90}>
              <div className={`sticker-card lift flex h-full gap-4 p-5 md:p-6 ${i === 3 ? "bg-[#ffd9cf]" : "bg-paper"}`}>
                <div className="shrink-0" aria-hidden>
                  {s.art}
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-muted">step {i + 1}</p>
                  <p className="display mt-1 text-2xl">{s.t}</p>
                  <p className="mt-2 text-ink/85">{s.d}</p>
                  <p className="mt-2 text-sm text-muted">{s.note}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
        <ul className="mt-8 flex flex-wrap gap-2.5">
          {proof.map(([l, h]) => (
            <li key={l}>
              <ProofLink href={h}>{l}</ProofLink>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

async function StatsSnapshot() {
  const s = await getStats();
  return <LiveStats initial={s} />;
}

function Live() {
  const ids: [string, string][] = [
    [`Bhav: ERC-8004 agent #${ERC8004.agentId}`, txUrl(ERC8004.tx)],
    [`Bhav: Self Agent ID #${SELF.agentId}`, txUrl(SELF.tx)],
    [`Household buyer: Self Agent ID #${BUYER.selfAgentId}`, addrUrl(BUYER.address)],
    ["First x402 payment", txUrl(FIRST_X402_TX)],
  ];
  return (
    <Section
      id="live"
      kicker="Live numbers"
      title={
        <>
          Every answer, <span className="text-leaf">on the record.</span>
        </>
      }
      lead="Straight from the running service: answers, payments and refusals. Payments settle on Celo mainnet. Each answer tells Bhav only what the human chose to share through Self: whether they are an adult, and their ID's country."
    >
      <Suspense fallback={<LiveStatsSkeleton />}>
        <StatsSnapshot />
      </Suspense>
      <ul className="mt-6 flex flex-wrap gap-2.5">
        {ids.map(([l, h]) => (
          <li key={l}>
            <ProofLink href={h}>{l}</ProofLink>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Code({ code, label }: { code: string; label: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border-2 border-ink bg-ink p-2.5 pl-4">
      <pre className="min-w-0 flex-1 whitespace-pre-wrap py-1 font-mono [overflow-wrap:anywhere] text-[12.5px] leading-6 text-white/90">
        <code>{code}</code>
      </pre>
      <CopyButton text={code} label="Copy" aria-label={label} tone="dark" />
    </div>
  );
}

function UseIt() {
  const clone = `git clone ${REPO_URL} && cd bhav && npm i`;
  const run = `node src/buyer.mjs "eggs 30"`;
  const curl = `curl -i "${PUBLIC_API}/v1/quote?q=eggs%2030"`;
  return (
    <Section
      id="use"
      kicker="For agents"
      title={
        <>
          Use it <span className="text-saffron-deep">from your agent.</span>
        </>
      }
      lead="Your agent signs each request with its Self Agent ID key and pays on its own when the free answers run out."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <Reveal className="sticker-card space-y-5 p-5 md:p-7">
          <div>
            <p className="font-bold">
              1. Register your agent with{" "}
              <a href={SELF_DOCS_URL} {...ext} className="text-saffron-deep underline underline-offset-4 hover:no-underline">
                Self Agent ID
              </a>
            </p>
            <p className="mt-1 text-sm text-muted">One passport or Aadhaar scan in the Self app, zero-knowledge.</p>
          </div>
          <div>
            <p className="mb-2 font-bold">2. Get the buyer agent (Node 22+)</p>
            <Code code={clone} label="Copy the clone command" />
          </div>
          <div>
            <p className="mb-2 font-bold">3. Ask</p>
            <p className="mb-2 text-sm text-muted">
              Put your agent key in <code className="font-semibold text-ink">~/.config/pi/bhav-buyer.env</code> as{" "}
              <code className="font-semibold text-ink">BUYER_PRIVATE_KEY=…</code>, plus a little USDC on Celo for paid calls.
            </p>
            <Code code={run} label="Copy the run command" />
          </div>
          <div>
            <p className="mb-2 font-bold">Or talk to it raw</p>
            <Code code={curl} label="Copy the curl command" />
          </div>
        </Reveal>
        <Reveal variant="pop" delay={100} className="relative">
          <div className="sticker-card rotate-1 bg-turmeric p-6 md:p-7">
            <p className="display text-3xl">Building your own agent?</p>
            <p className="mt-3 text-ink/85">
              Request signing, the x402 flow, the answer format and the limits are written down for agents in AGENTS.md.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={AGENTS_MD_URL} {...ext} className="pill tap bg-ink px-5 py-2.5 text-paper">
                Read AGENTS.md
              </a>
              <a href={REPO_URL} {...ext} className="pill tap bg-white px-5 py-2.5 text-ink">
                <GitHubIcon className="size-4" />
                GitHub
              </a>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border-2 border-dashed border-ink/30 p-5 text-sm text-muted">
            <p className="font-bold text-ink">Plain limits</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Prices are for Kochi only.</li>
              <li>&ldquo;Usual price&rdquo; means usual since {TRACKING_SINCE}; new items say &ldquo;no history yet&rdquo;.</li>
              <li>Self proves a unique human, not a trustworthy one.</li>
              <li>An answer is a snapshot: the store&apos;s bill is the final word.</li>
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

export default function Home() {
  return (
    <>
      <StickerDefs />
      <Header />
      <main id="main">
        <Hero />
        <Ticker />
        <Partners />
        <Try />
        <TheGate />
        <Pay />
        <Household />
        <Live />
        <UseIt />
      </main>
      <Footer />
    </>
  );
}
