import type { Metadata } from "next";
import { Footer, Header, Status } from "../components/Chrome";
import { PRICE_RECORDS, TRACKING_SINCE } from "@/lib/bhav";

export const metadata: Metadata = {
  title: "How Bhav works",
  description:
    "The Bhav flow step by step: an agent asks, Self Agent ID proves a human is behind it, free quota or an x402 payment, the answer, then the cart through Agent Vault. Plus the limits, stated plainly.",
};

function H({ i, rest, id }: { i: string; rest: string; id: string }) {
  return (
    <h2 id={id} className="display scroll-mt-20 text-[2.4rem] text-lime md:text-[3.8rem]">
      <span className="serif-i">{i}</span> {rest}
    </h2>
  );
}

type Step = { who: string; t: string; d: string; live: boolean };

const ASK: Step[] = [
  {
    who: "caller's agent",
    t: "An agent asks",
    d: "“What's the cheapest 1 kg chicken in Kochi right now, and is it a real deal?” It sends the question to Bhav's price service with its Self Agent ID attached.",
    live: false,
  },
  {
    who: "Self",
    t: "Is a real human behind it?",
    d: "Bhav checks the Self Agent ID registry on Celo. The proof says a real, unique person backs this agent, without saying who. No ID, no answer: an agent with no human behind it is refused.",
    live: true,
  },
  {
    who: "Bhav",
    t: "Free quota, or pay",
    d: "Each human gets a free daily quota, counted per human, not per agent, so running ten agents doesn't buy ten quotas. After that the server replies “402 Payment Required” with a price of a few cents.",
    live: false,
  },
  {
    who: "x402 · Celo",
    t: "The agent pays",
    d: "The agent pays that price in USDC on Celo and retries the request with the payment attached. No account, no API key, no subscription.",
    live: false,
  },
  {
    who: "Bhav",
    t: "The answer comes back",
    d: `The cheapest offer across Zepto, Blinkit and Instamart, priced per kg or per piece, compared with what that product usually costs according to our tracker's history (${PRICE_RECORDS} records since ${TRACKING_SINCE}). A real deal, normal, or a spike.`,
    live: false,
  },
];

const CART: Step[] = [
  {
    who: "household agent",
    t: "Pick the offer",
    d: "The household's own agent takes the cheapest offer from the answer and builds the cart in that store.",
    live: false,
  },
  {
    who: "Agent Vault",
    t: "Sign in without seeing secrets",
    d: "It signs in to the store through Agent Vault. The agent can use the login and the saved card, but never sees the password or the card number.",
    live: false,
  },
  {
    who: "the person",
    t: "Approve on the phone",
    d: "Nothing is ordered until the person approves on their phone. If the store sends an OTP, Agent Vault hands it to the person to enter, not to the agent.",
    live: false,
  },
];

const LIMITS: [string, string][] = [
  ["Prices are for Kochi only.", "The tracker reads stores that deliver to Kochi addresses. Other cities have different prices and different stock."],
  [
    "The history starts in July 2026.",
    "“Usual price” means usual since then. A product we started tracking last week has a thin history, and the answer should say so.",
  ],
  [
    "Self proves a unique human, not a trustworthy one.",
    "It stops one person from posing as a thousand agents. It says nothing about whether that person, or their agent, means well.",
  ],
  [
    "Agent Vault hands OTPs to the person.",
    "Stores that ask for a one-time password at login or payment still need a human to type it. That is on purpose, and it means checkout is not fully hands-off.",
  ],
  [
    "Shop prices change and can differ by address.",
    "An answer is a snapshot. The store's own bill at checkout is the final word.",
  ],
  [
    "Most of this is still being built.",
    "Live on Celo mainnet today: the ERC-8004 agent identity and the Self Agent ID. The price service, x402 payments and Agent Vault checkout are being built.",
  ],
];

function Flow({ steps, start = 1 }: { steps: Step[]; start?: number }) {
  return (
    <ol className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {steps.map((s, n) => (
        <li key={s.t} className="bg-bg p-6">
          <p className="flex items-center justify-between gap-3">
            <span aria-hidden className="serif-i text-3xl leading-none text-lime">
              {start + n}
            </span>
            <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-muted">{s.who}</span>
          </p>
          <p className="mt-4 font-semibold">
            <span className="sr-only">Step {start + n}: </span>
            {s.t}
          </p>
          <p className="mt-1 text-sm text-muted">{s.d}</p>
          <p className="mt-3">
            <Status live={s.live} />
          </p>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorks() {
  return (
    <>
      <Header home={false} />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-5 md:pt-28">
        <h1 className="display text-[3.2rem] text-lime md:text-[6rem]">
          <span className="serif-i">how</span> bhav works.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          The whole flow, step by step. Each step is labelled: <Status live /> means it is running on Celo mainnet
          today, <Status live={false} /> means it is not done yet.
        </p>
        <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
          {[
            ["#ask", "asking for a price"],
            ["#cart", "filling the cart"],
            ["#limits", "limits"],
          ].map(([h, l]) => (
            <a key={h} href={h} className="rounded-full border border-line px-3 py-1.5 text-fg/80 hover:border-lime hover:text-lime">
              {l}
            </a>
          ))}
        </nav>

        <section className="mt-16" aria-labelledby="ask">
          <H id="ask" i="asking" rest="for a price." />
          <Flow steps={ASK} />
          <div className="mt-6 overflow-x-auto rounded-2xl bg-ink p-5 font-mono text-[13px] leading-7">
            <p className="text-muted"># the x402 round trip, in four lines (planned)</p>
            <p className="whitespace-pre">
              <span className="text-lime">→ </span>GET /price?item=chicken-curry-cut&amp;city=kochi
            </p>
            <p className="whitespace-pre">
              <span className="text-mustard">← </span>402 Payment Required · a few cents, USDC on Celo
            </p>
            <p className="whitespace-pre">
              <span className="text-lime">→ </span>same request + signed payment + Self Agent ID
            </p>
            <p className="whitespace-pre">
              <span className="text-lime">← </span>200 OK · cheapest offer, usual price, verdict
            </p>
          </div>
        </section>

        <section className="mt-20" aria-labelledby="cart">
          <H id="cart" i="filling" rest="the cart." />
          <Flow steps={CART} start={ASK.length + 1} />
        </section>

        <section className="mt-20" aria-labelledby="limits">
          <H id="limits" i="limits," rest="stated plainly." />
          <ul className="mt-8 space-y-3">
            {LIMITS.map(([t, d]) => (
              <li key={t} className="card p-5">
                <p className="text-lg font-semibold">{t}</p>
                <p className="mt-1 leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
