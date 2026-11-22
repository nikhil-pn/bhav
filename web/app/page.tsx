import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import hero from "@/public/img/hero.jpg";
import LiveProof, { LiveProofSkeleton } from "./components/LiveProof";
import X402Stats from "./components/X402Stats";
import { Footer, Header, Section, Status, ext } from "./components/Chrome";
import {
  AGENT_WALLET,
  ATTRIBUTION_TAG,
  ERC8004,
  HACKATHON,
  PRICE_RECORDS,
  REPO_URL,
  SELF,
  TEAM,
  TRACKING_SINCE,
  TRACKS,
  addrUrl,
  short,
  txUrl,
} from "@/lib/bhav";

function Hero() {
  return (
    <section id="top" aria-labelledby="hero-h" className="relative">
      <div className="mx-auto grid max-w-6xl md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:items-end md:gap-12 md:px-5 md:pt-20">
        {/* The poster: fixed 4:5 box, headline set on the photo. */}
        <div className="@container relative aspect-[4/5] w-full overflow-hidden md:rounded-[1.75rem]">
          <Image
            src={hero}
            alt="A hand carrying a green grocery basket with strawberries and a bottle of green juice"
            priority
            placeholder="blur"
            sizes="(min-width: 768px) 560px, 100vw"
            className="absolute inset-0 size-full object-cover"
          />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-bg/90 via-bg/35 to-transparent" />
          <div className="absolute bottom-[5%] right-[5%] text-right">
            <h1 id="hero-h" className="display text-[15cqw] text-lime">
              <span className="serif-i">know</span> the
              <br />
              bhav.
            </h1>
            <p className="mt-[2.5cqw] text-[3.6cqw] leading-snug text-fg">
              One question. Three shops.
              <br />
              A price you can trust.
            </p>
          </div>
        </div>

        <div className="px-4 pb-6 pt-10 sm:px-5 md:px-0 md:pb-10 md:pt-0">
          <p className="flex flex-wrap items-center gap-2">
            <Status live={false}>work in progress</Status>
            <span className="text-xs text-muted">
              {HACKATHON.host} · {HACKATHON.name} · due {HACKATHON.deadline}
            </span>
          </p>
          <p className="mt-5 text-xl leading-relaxed text-pretty md:text-2xl">
            <b>Bhav</b> (<span lang="hi">भाव</span>, Hindi for “price”, as in <i>mandi bhav</i>) is a grocery agent for
            Indian households, being built to answer one question: what do <b>Zepto, Blinkit and Instamart</b> charge right
            now, and is that actually a deal?
          </p>
          <p className="mt-4 text-pretty text-muted">
            Other agents will ask it and pay a few cents in USDC on Celo for the answer. Every caller has to show that a
            real, unique human stands behind it. Then the cart gets filled, and the person approves on their phone.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/how-it-works" className="tap rounded-full bg-lime px-6 py-3.5 font-semibold text-ink">
              How it works
            </Link>
            <a
              href={REPO_URL}
              {...ext}
              className="tap rounded-full border border-fg/25 px-6 py-3.5 font-semibold hover:border-lime hover:text-lime"
            >
              Code on GitHub
            </a>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-2 border-t border-line pt-6">
            {[
              [PRICE_RECORDS, `price records since ${TRACKING_SINCE}`],
              ["3", "shops, in Kochi"],
              [`#${ERC8004.agentId}`, "ERC-8004 agent on Celo"],
            ].map(([v, l]) => (
              <div key={l} className="min-w-0">
                <dt className="sr-only">{l}</dt>
                <dd className="text-2xl font-medium tracking-tight tabular-nums sm:text-3xl">{v}</dd>
                <dd className="mt-1 text-xs text-muted">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/** The shape of an answer. The service is being built, so no prices are shown. */
function AnswerShape() {
  const rows: [string, string][] = [
    ["item", "1 kg chicken, curry cut"],
    ["city", "Kochi"],
    ["cheapest now", "Zepto · Blinkit · Instamart"],
    ["price", "₹ per kg, pack maths done"],
    ["usual price", "from our own history"],
    ["verdict", "real deal / normal / spike"],
  ];
  return (
    <figure className="receipt mx-auto w-full max-w-sm rotate-[1.5deg] rounded-t-xl p-6 font-mono text-[13px] shadow-2xl">
      <p className="text-center font-sans text-2xl">
        <span className="serif-i">bhav</span>
      </p>
      <p className="text-center text-[11px] uppercase tracking-widest text-ink/60">the shape of an answer</p>
      <div className="my-4 border-t border-dashed border-ink/30" />
      {rows.map(([a, b]) => (
        <p key={a} className="flex justify-between gap-4">
          <span className="shrink-0 text-ink/60">{a}</span>
          <span className="text-right">{b}</span>
        </p>
      ))}
      <div className="my-4 border-t border-dashed border-ink/30" />
      <p className="flex justify-between gap-4">
        <span className="text-ink/60">caller</span>
        <span className="text-right">Self Agent ID ✓</span>
      </p>
      <p className="flex justify-between gap-4">
        <span className="text-ink/60">paid</span>
        <span className="text-right">free quota, or cents in USDC</span>
      </p>
      <p className="mt-2 flex justify-between rounded bg-lime px-2 py-1 font-bold">
        <span>VIA</span>
        <span>x402 · Celo</span>
      </p>
      <p aria-hidden className="mt-4 overflow-hidden whitespace-nowrap text-center text-3xl leading-none tracking-[-0.12em] text-ink/80">
        ||| || ||| | |||| || |||
      </p>
      <figcaption className="mt-1 text-center text-[10.5px] text-ink/55">
        format only · the price service is being built
      </figcaption>
    </figure>
  );
}

function What() {
  const steps: [string, React.ReactNode, boolean][] = [
    [
      "It knows the price",
      <>
        Live grocery prices from Zepto, Blinkit and Instamart in Kochi, plus a price history our own tracker has collected
        since {TRACKING_SINCE}: {PRICE_RECORDS} records. Other agents ask “what&apos;s the cheapest 1 kg chicken right
        now, and is it a real deal?” and pay a few cents per answer in USDC over x402 on Celo.
      </>,
      false,
    ],
    [
      "One fair quota per human",
      <>
        Every caller must carry a Self Agent ID: a zero-knowledge proof that a real, unique human stands behind the
        agent. Each human gets a free daily quota; after that the agent pays. An agent with no human behind it is
        refused.
      </>,
      false,
    ],
    [
      "It fills the cart",
      <>
        The household&apos;s agent picks the cheapest offer, signs in to the store through Agent Vault (it never sees the
        password or card), and the person approves on their phone.
      </>,
      false,
    ],
  ];
  return (
    <Section
      id="what"
      i="one"
      rest="question, three shops."
      lead="What Bhav does, in three steps. The identity pieces are live on Celo today; the price service, payments and checkout are being built."
    >
      <div className="grid grid-cols-1 gap-14 md:grid-cols-2 md:items-center [&>*]:min-w-0">
        <ol className="space-y-8">
          {steps.map(([t, d, live], n) => (
            <li key={t} className="flex gap-5">
              <span aria-hidden className="serif-i w-8 shrink-0 text-5xl leading-none text-lime">
                {n + 1}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-xl font-semibold">
                  {t} <Status live={live} />
                </p>
                <p className="mt-1 text-muted">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <AnswerShape />
      </div>
    </Section>
  );
}

function Proof() {
  const live: [string, React.ReactNode][] = [
    [
      `ERC-8004 agent #${ERC8004.agentId}`,
      <a key="a" href={txUrl(ERC8004.tx)} {...ext} className="text-lime underline-offset-2 hover:underline">
        registration tx {short(ERC8004.tx, 8, 4)} ↗
      </a>,
    ],
    [
      `Self Agent ID #${SELF.agentId}, backed by a real human`,
      <span key="b">
        Aadhaar, age 18+, zero-knowledge ·{" "}
        <a href={txUrl(SELF.tx)} {...ext} className="text-lime underline-offset-2 hover:underline">
          tx {short(SELF.tx, 8, 4)} ↗
        </a>
      </span>,
    ],
    [
      "Agent wallet",
      <a key="c" href={addrUrl(AGENT_WALLET)} {...ext} className="break-all font-mono text-lime underline-offset-2 hover:underline">
        {AGENT_WALLET} ↗
      </a>,
    ],
    ["Attribution tag", <code key="d" className="font-mono text-fg">{ATTRIBUTION_TAG}</code>],
  ];
  const coming = [
    ["Price service", "Answers from the live prices and the history, per item and city."],
    ["x402 payments", "A few cents in USDC on Celo per answer, after the free quota."],
    ["Agent Vault checkout", "Store sign-in without the agent ever seeing the password or card."],
  ];
  return (
    <Section
      id="proof"
      i="live"
      rest="on Celo, today."
      lead="Here is what exists onchain right now, read live from Celo mainnet, and what is still being built. We label each one plainly."
    >
      <Suspense fallback={<LiveProofSkeleton />}>
        <LiveProof />
      </Suspense>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
        <div className="rounded-3xl bg-basket p-6">
          <p className="flex items-center justify-between gap-3">
            <span className="serif-i text-3xl text-lime">live now</span>
            <Status live />
          </p>
          <ul className="mt-5 space-y-4">
            {live.map(([t, d]) => (
              <li key={t}>
                <p className="font-semibold">{t}</p>
                <p className="mt-0.5 text-sm text-fg/75">{d}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <p className="flex items-center justify-between gap-3">
            <span className="serif-i text-3xl text-lime">coming</span>
            <Status live={false} />
          </p>
          <ul className="mt-5 space-y-4">
            {coming.map(([t, d]) => (
              <li key={t}>
                <p className="font-semibold">{t}</p>
                <p className="mt-0.5 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4">
        <X402Stats />
      </div>
    </Section>
  );
}

function Stack() {
  const explainers: [string, string, string][] = [
    [
      "Self Agent ID",
      "A passport stamp for an AI agent: proves a real person is behind it without saying who.",
      "Bhav checks it on every call. One human, one free quota, however many agents they run.",
    ],
    [
      "x402",
      "The web's “payment required” code finally used: the server names a price, the agent pays a few cents in dollars, the answer comes back.",
      "No account, no API key, no monthly plan. USDC on Celo, per answer.",
    ],
    [
      "Agent Vault",
      "A password manager your agent can use without ever seeing the passwords.",
      "The agent can sign in to the store and check out. The password and card stay locked away.",
    ],
  ];
  return (
    <Section id="stack" i="the" rest="stack.">
      <p className="text-sm uppercase tracking-widest text-muted">Tracks we&apos;re entering</p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
        {TRACKS.map((t) => (
          <div key={t.name} className="card p-6">
            <p className="font-mono text-sm text-lime">{t.sponsor}</p>
            <p className="mt-2 text-xl font-semibold">{t.name}</p>
          </div>
        ))}
      </div>

      <p className="mt-14 text-sm uppercase tracking-widest text-muted">In plain words</p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 [&>*]:min-w-0">
        {explainers.map(([k, plain, why]) => (
          <div key={k} className="card flex flex-col p-6">
            <p className="serif-i text-3xl text-lime">{k}</p>
            <p className="mt-3 text-lg leading-snug">{plain}</p>
            <p className="mt-3 text-sm text-muted">{why}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        Underneath: Celo mainnet, an ERC-8004 agent identity, and the price tracker we&apos;ve run since{" "}
        {TRACKING_SINCE}.
      </p>
    </Section>
  );
}

function Team() {
  return (
    <section id="team" aria-labelledby="team-h" className="border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 md:py-28">
        <h2 id="team-h" className="display text-[2.8rem] text-lime md:text-[4.5rem]">
          <span className="serif-i">who</span> builds it.
        </h2>
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m) => (
            <li key={m.name} className="card p-6">
              <div
                aria-hidden
                className="grid size-20 place-items-center rounded-full bg-lime font-serif text-3xl italic text-ink"
              >
                {m.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <p className="mt-5 text-2xl font-semibold">{m.name}</p>
              <p className="serif-i text-2xl text-lime">{m.role}</p>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <a href={m.github} {...ext} className="text-lime underline-offset-4 hover:underline">
                  GitHub ↗
                </a>
                <a href={m.x} {...ext} className="text-lime underline-offset-4 hover:underline">
                  X @{m.handle} ↗
                </a>
              </p>
            </li>
          ))}
        </ul>
        <a href={REPO_URL} {...ext} className="mt-10 inline-block text-lime underline-offset-4 hover:underline">
          github.com/nikhil-pn/bhav ↗
        </a>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <What />
        <Proof />
        <Stack />
        <Team />
      </main>
      <Footer />
    </>
  );
}
