import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import hero from "@/public/img/hero.jpg";
import AskBhav from "./components/AskBhav";
import Gate from "./components/Gate";
import LiveStats, { LiveStatsSkeleton } from "./components/LiveStats";
import CopyButton from "./components/CopyButton";
import { Footer, Header, Section, ext } from "./components/Chrome";
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
  addrUrl,
  txUrl,
  VAULT,
} from "@/lib/bhav";

function Hero() {
  return (
    <section id="try" aria-labelledby="hero-h" className="relative">
      <div className="mx-auto grid max-w-6xl grid-cols-1 [&>*]:min-w-0 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:items-start md:gap-12 md:px-5 md:pt-24">
        {/* The poster: headline set on the photo. Square on phones so the product is near the top. */}
        <div className="@container relative aspect-square w-full overflow-hidden md:sticky md:top-24 md:aspect-[4/5] md:rounded-[1.75rem]">
          <Image
            src={hero}
            alt="A hand carrying a green grocery basket with strawberries and a bottle of green juice"
            priority
            placeholder="blur"
            sizes="(min-width: 768px) 500px, 100vw"
            className="absolute inset-0 size-full object-cover object-[50%_70%]"
          />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-bg/90 via-bg/35 to-transparent" />
          <div className="absolute bottom-[5%] right-[5%] text-right">
            <h1 id="hero-h" className="display text-[15cqw] text-lime">
              <span className="serif-i">know</span> the
              <br />
              bhav.
            </h1>
            <p className="mt-[2.5cqw] text-[3.8cqw] leading-snug text-fg">
              One question. Three shops.
              <br />
              A price you can trust.
            </p>
          </div>
        </div>

        <div className="px-4 pb-6 pt-8 sm:px-5 md:px-0 md:pb-10 md:pt-0">
          <p className="text-xl leading-relaxed text-pretty md:text-2xl">
            Ask for any grocery. <b>Bhav</b> (<span lang="hi">भाव</span>, “price”) checks <b>Zepto, Blinkit and
            Instamart</b> in Kochi right now and tells you if it&apos;s actually a deal.
          </p>
          <p className="mt-3 text-pretty text-muted">
            Built for AI agents, paid in USDC on Celo. Try it yourself first:
          </p>
          <div className="mt-6">
            <AskBhav />
          </div>
        </div>
      </div>
    </section>
  );
}

function TheGate() {
  const steps: [string, string, React.ReactNode][] = [
    [
      "Self Agent ID check",
      "A passport stamp for an AI agent: proves a real person is behind it without saying who.",
      <>No stamp, no answer: that is the 403 the button triggers.</>,
    ],
    [
      `${FREE_PER_DAY} free answers per human, per day`,
      "Counted per human, not per agent.",
      <>Running ten agents doesn&apos;t buy ten quotas.</>,
    ],
    [
      `Then ${PRICE_USDC} USDC over x402`,
      "x402 is the web's “payment required” code, finally used.",
      <>The server names a price, the agent pays in USDC on Celo and retries. No account, no API key.</>,
    ],
  ];
  return (
    <Section
      id="gate"
      i="the"
      rest="gate."
      lead="Bhav only answers agents with a real, unique human behind them. Try being a bot:"
      className="border-t border-line"
    >
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 [&>*]:min-w-0">
        <Gate />
        <ol className="space-y-7">
          {steps.map(([t, plain, why], n) => (
            <li key={t} className="flex gap-5">
              <span aria-hidden className="serif-i w-8 shrink-0 text-5xl leading-none text-lime">
                {n + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xl font-semibold">{t}</p>
                <p className="mt-1">{plain}</p>
                <p className="mt-1 text-sm text-muted">{why}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

async function StatsSnapshot() {
  const s = await getStats();
  return <LiveStats initial={s} />;
}

function Live() {
  const ids: [string, string][] = [
    [`ERC-8004 agent #${ERC8004.agentId}`, txUrl(ERC8004.tx)],
    [`Self Agent ID #${SELF.agentId} (Bhav)`, txUrl(SELF.tx)],
    [`Self Agent ID #${BUYER.selfAgentId} (our household buyer)`, addrUrl(BUYER.address)],
    ["first x402 payment", txUrl(FIRST_X402_TX)],
  ];
  return (
    <Section
      id="live"
      i="live"
      rest="on Celo."
      lead="Every agent answer, every payment and every refusal, straight from the running service. Payments settle on Celo mainnet."
      className="border-t border-line"
    >
      <Suspense fallback={<LiveStatsSkeleton />}>
        <StatsSnapshot />
      </Suspense>
      <ul className="mt-5 flex flex-wrap gap-2 text-sm">
        {ids.map(([l, h]) => (
          <li key={l}>
            <a
              href={h}
              {...ext}
              className="inline-block rounded-full border border-line px-3 py-1.5 text-fg/85 hover:border-lime hover:text-lime"
            >
              {l} ↗
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Vault() {
  const steps: [string, ReactNode, string][] = [
    ["It proves a human is behind it.", <>The household agent signs every request with its Self Agent ID and asks Bhav for the cheapest price.</>, "Self Agent ID #212: same person as Bhav's own agent, one shared free quota."],
    ["It signs in without your password.", <>It signs in to amazon.in through Agent Vault. It only ever holds placeholder tokens; Agent Vault types the real password.</>, "Amazon's one-time code goes to your phone, never to the agent."],
    ["It pays from a capped wallet.", <>It pays for Buy services in USDC on Celo from your Agent Vault wallet, under an agent card you set.</>, `Limits: ${VAULT.limits.perPayment} per payment, ${VAULT.limits.weekly} a week, ${VAULT.limits.monthly} a month.`],
    ["It gets stopped.", <>Asked to pay $0.04, Agent Vault refuses: over the per-payment cap. Nothing is paid and the card pauses until you resume it.</>, "A hard limit the agent cannot talk its way past."],
  ];
  const proof: [string, string][] = [
    ["Agent Vault wallet", addrUrl(VAULT.wallet)],
    ["first payment from Agent Vault", txUrl(VAULT.firstBuyPaymentTx)],
    ["the cap refusal (screenshot)", VAULT.capRefusalProof],
  ];
  return (
    <Section
      id="vault"
      i="its"
      rest="hands."
      lead="Bhav finds the price. The household agent acts on it through Agent Vault, with your password and your money out of its reach."
      className="border-t border-line"
    >
      <ol className="grid grid-cols-1 gap-7 md:grid-cols-2">
        {steps.map(([t, plain, why], n) => (
          <li key={t} className="flex gap-5">
            <span aria-hidden className="serif-i w-8 shrink-0 text-5xl leading-none text-lime">{n + 1}</span>
            <div className="min-w-0">
              <p className="text-xl font-semibold">{t}</p>
              <p className="mt-1">{plain}</p>
              <p className="mt-1 text-sm text-muted">{why}</p>
            </div>
          </li>
        ))}
      </ol>
      <ul className="mt-8 flex flex-wrap gap-2 text-sm">
        {proof.map(([l, h]) => (
          <li key={l}>
            <a href={h} {...ext} className="inline-block rounded-full border border-line px-3 py-1.5 text-fg/85 hover:border-lime hover:text-lime">
              {l} ↗
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Code({ code, label }: { code: string; label: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl bg-ink p-3 pl-4">
      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all py-1.5 font-mono text-[12.5px] leading-6 text-fg/90">
        <code>{code}</code>
      </pre>
      <CopyButton text={code} label="Copy" className="mt-0.5" aria-label={label} />
    </div>
  );
}

function UseIt() {
  const clone = `git clone ${REPO_URL} && cd bhav && npm i`;
  const run = `node src/buyer.mjs "eggs 30"   # talks to ${PUBLIC_API} on Celo mainnet`;
  const curl = `curl -i "${PUBLIC_API}/v1/quote?q=eggs%2030"`;
  return (
    <Section
      id="use"
      i="use"
      rest="it from your agent."
      lead="Three steps. Your agent signs each request with its Self Agent ID key and pays on its own when the free answers run out."
      className="border-t border-line"
    >
      <ol className="grid grid-cols-1 gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <li className="card p-6">
          <p className="serif-i text-4xl leading-none text-lime">1</p>
          <p className="mt-4 text-lg font-semibold">Register your agent with Self Agent ID</p>
          <p className="mt-1 text-sm text-muted">
            One scan of your passport or Aadhaar in the Self app, zero-knowledge. Your agent gets a key that proves a
            human is behind it.
          </p>
          <a href={SELF_DOCS_URL} {...ext} className="mt-4 inline-block text-sm font-semibold text-lime underline-offset-4 hover:underline">
            Self Agent ID docs ↗
          </a>
        </li>
        <li className="card p-6">
          <p className="serif-i text-4xl leading-none text-lime">2</p>
          <p className="mt-4 text-lg font-semibold">Get the buyer agent</p>
          <p className="mt-1 text-sm text-muted">Node 22+. The repo has a ready household buyer agent.</p>
          <Code code={clone} label="Copy the clone command" />
        </li>
        <li className="card p-6">
          <p className="serif-i text-4xl leading-none text-lime">3</p>
          <p className="mt-4 text-lg font-semibold">Ask</p>
          <p className="mt-1 text-sm text-muted">
            Put your agent key in <code className="text-fg/85">~/.config/pi/bhav-buyer.env</code> as{" "}
            <code className="text-fg/85">BUYER_PRIVATE_KEY=…</code>, plus a little USDC on Celo for paid calls.
          </p>
          <Code code={run} label="Copy the run command" />
        </li>
      </ol>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr] md:items-start [&>*]:min-w-0">
        <div>
          <p className="text-sm font-semibold">Or talk to it raw</p>
          <Code code={curl} label="Copy the curl command" />
          <div className="mt-3 overflow-x-auto rounded-xl bg-ink p-4 font-mono text-[12.5px] leading-7">
            <p className="whitespace-pre">
              <span className="text-mustard">← 403</span> human_backed_agents_only{" "}
              <span className="text-muted"># no Self Agent ID headers</span>
            </p>
            <p className="whitespace-pre">
              <span className="text-lime">← 200</span> answer{" "}
              <span className="text-muted"># signed, within {FREE_PER_DAY} free a day</span>
            </p>
            <p className="whitespace-pre">
              <span className="text-mustard">← 402</span> payment-required: {PRICE_USDC} USDC{" "}
              <span className="text-muted"># signed, quota used</span>
            </p>
            <p className="whitespace-pre">
              <span className="text-lime">← 200</span> answer + payment-response{" "}
              <span className="text-muted"># retried with X-PAYMENT</span>
            </p>
          </div>
        </div>
        <div className="card p-6">
          <p className="text-lg font-semibold">Building your own agent?</p>
          <p className="mt-1 text-sm text-muted">
            The request signing, the x402 flow, the answer format and the limits are written down for agents in
            AGENTS.md.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={AGENTS_MD_URL} {...ext} className="tap rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-ink">
              Read AGENTS.md
            </a>
            <a
              href={REPO_URL}
              {...ext}
              className="tap rounded-full border border-fg/25 px-5 py-2.5 text-sm font-semibold hover:border-lime hover:text-lime"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </Section>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <TheGate />
        <Live />
        <Vault />
        <UseIt />
      </main>
      <Footer />
    </>
  );
}
