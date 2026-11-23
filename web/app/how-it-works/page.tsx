import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header, Status } from "../components/Chrome";
import { FREE_PER_DAY, PRICE_RECORDS, PRICE_USDC, TRACKING_SINCE } from "@/lib/bhav";

export const metadata: Metadata = {
  title: "How Bhav works",
  description: `An agent asks, Self Agent ID proves a human is behind it, ${FREE_PER_DAY} free answers a day per human, then ${PRICE_USDC} USDC over x402 on Celo. Plus the limits, stated plainly.`,
};

function H({ i, rest, id }: { i: string; rest: string; id: string }) {
  return (
    <h2 id={id} className="display scroll-mt-20 text-[2.4rem] text-lime md:text-[3.8rem]">
      <span className="serif-i">{i}</span> {rest}
    </h2>
  );
}

const ASK: { who: string; t: string; d: string }[] = [
  {
    who: "caller's agent",
    t: "An agent asks",
    d: "“What's the cheapest 1 kg chicken in Kochi right now, and is it a real deal?” It calls GET /v1/quote, signed with its Self Agent ID key.",
  },
  {
    who: "Self",
    t: "Is a real human behind it?",
    d: "Bhav checks the signature against the Self Agent ID registry on Celo. The proof says a real, unique person backs this agent, without saying who. No ID: 403, refused.",
  },
  {
    who: "Bhav",
    t: "Free quota, or pay",
    d: `${FREE_PER_DAY} free answers per human per day, counted per human, not per agent. After that the server replies 402 Payment Required for ${PRICE_USDC} USDC.`,
  },
  {
    who: "x402 · Celo",
    t: "The agent pays",
    d: "The agent pays in USDC on Celo and retries with the payment attached. No account, no API key, no subscription.",
  },
  {
    who: "Bhav",
    t: "The answer",
    d: `The cheapest offer across Zepto, Blinkit and Instamart, priced per kg or per piece, compared with that product's usual price from our tracker (${PRICE_RECORDS} records since ${TRACKING_SINCE}): a deal, normal, or pricier than usual.`,
  },
];

const LIMITS: [string, string][] = [
  ["Prices are for Kochi only.", "The tracker reads stores that deliver to Kochi addresses. Other cities have different prices and stock."],
  [
    `“Usual price” means usual since ${TRACKING_SINCE}.`,
    "A product we haven't tracked before has no history, and the answer says “no history yet” instead of guessing.",
  ],
  [
    "Self proves a unique human, not a trustworthy one.",
    "It stops one person from posing as a thousand agents. It says nothing about whether that person means well.",
  ],
  [
    "The website demo is a slow lane.",
    "It answers one question at a time across all visitors (about one every 12 s) and is never billed. Agents use /v1/quote.",
  ],
  ["An answer is a snapshot.", "Shop prices change and can differ by address. The store's own bill at checkout is the final word."],
];

export default function HowItWorks() {
  return (
    <>
      <Header home={false} />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-5 md:pt-28">
        <h1 className="display text-[3.2rem] text-lime md:text-[6rem]">
          <span className="serif-i">how</span> bhav works.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Running on Celo mainnet today. Want to see it first?{" "}
          <Link href="/#try" className="text-lime underline-offset-4 hover:underline">
            Ask Bhav a price
          </Link>
          .
        </p>

        <section className="mt-14" aria-labelledby="ask">
          <H id="ask" i="asking" rest="for a price." />
          <ol className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {ASK.map((s, n) => (
              <li key={s.t} className="bg-bg p-6">
                <p className="flex items-center justify-between gap-3">
                  <span aria-hidden className="serif-i text-3xl leading-none text-lime">
                    {n + 1}
                  </span>
                  <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-muted">{s.who}</span>
                </p>
                <p className="mt-4 font-semibold">
                  <span className="sr-only">Step {n + 1}: </span>
                  {s.t}
                </p>
                <p className="mt-1 text-sm text-muted">{s.d}</p>
              </li>
            ))}
            <li className="bg-bg p-6">
              <p className="flex items-center justify-between gap-3">
                <span aria-hidden className="serif-i text-3xl leading-none text-lime">
                  6
                </span>
                <Status live={false} />
              </p>
              <p className="mt-4 font-semibold">
                <span className="sr-only">Step 6: </span>Fill the cart
              </p>
              <p className="mt-1 text-sm text-muted">
                The household agent signs in to the store through Agent Vault (it never sees the password or card), and
                the person approves on their phone.
              </p>
            </li>
          </ol>
          <div className="mt-6 overflow-x-auto rounded-2xl bg-ink p-5 font-mono text-[13px] leading-7">
            <p className="text-muted"># the round trip</p>
            <p className="whitespace-pre">
              <span className="text-lime">→ </span>GET /v1/quote?q=chicken%20curry%20cut + Self Agent ID signature
            </p>
            <p className="whitespace-pre">
              <span className="text-mustard">← </span>402 Payment Required · {PRICE_USDC} USDC on Celo
            </p>
            <p className="whitespace-pre">
              <span className="text-lime">→ </span>same request + X-PAYMENT (signed USDC transfer)
            </p>
            <p className="whitespace-pre">
              <span className="text-lime">← </span>200 OK · cheapest offer, usual price, verdict
            </p>
          </div>
        </section>

        <section className="mt-20" aria-labelledby="limits">
          <H id="limits" i="limits," rest="stated plainly." />
          <ul className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
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
