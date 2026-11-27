// Shapes of Bhav's public API responses, plus small formatting helpers.
// Client-safe: no server-only imports here.

export type Verdict = "deal" | "normal" | "pricier" | "unknown";

export type Offer = {
  platform: string;
  id?: string;
  name: string;
  price: number;
  mrp?: number | null;
  grams?: number | null;
  units?: number | null;
  perKg?: number | null;
  perUnit?: number | null;
  inStock?: boolean;
  url?: string;
  fetchedAt?: string;
  pack?: string;
  volume?: boolean;
  deal?: {
    verdict: Verdict;
    pctVsTypical: number | null;
    typical: number | null;
    allTimeLow: { price: number; date: string } | null;
    newLow?: boolean;
    observations?: number;
  };
};

export type DemoAnswer = {
  demo: true;
  note?: string;
  query?: string;
  by?: "perKg" | "perUnit" | string;
  answer: string;
  best: Offer | null;
  offers: Offer[];
  matched?: number;
  scanned?: number;
  errors?: Record<string, string>;
  historyAsOf?: string;
};

export type StatsEvent = {
  ts: string;
  kind: "free" | "paid" | "refused";
  q?: string;
  answer?: string;
  agentId?: string;
  agent?: string;
  reason?: string;
  tx?: string;
};

export type Stats = {
  network: string;
  explorer: string;
  payTo: string;
  price: string;
  freePerHumanPerDay: number;
  since?: string;
  totals: {
    agentAnswers: number;
    free: number;
    paid: number;
    refused: number;
    demo: number;
    humans: number;
    agents: number;
    usdcEarned: number;
    humansByCountry?: Record<string, number>;
    adultHumans?: number;
  };
  settlements: { ts: string; tx: string; payer: string; q: string }[];
  recent: StatsEvent[];
};

export function isStats(x: unknown): x is Stats {
  return !!x && typeof x === "object" && "totals" in x && typeof (x as Stats).totals === "object";
}

export const STORE: Record<string, string> = { zepto: "Zepto", blinkit: "Blinkit", instamart: "Instamart" };
export const storeName = (p: string) => STORE[p] ?? p;

const rupee = (n: number) =>
  "₹" + (Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export { rupee };

/** "₹9.50/pc" or "₹312/kg" or "₹64/L", depending on how the answer was compared. */
export function perLabel(o: Offer, by?: string): string | null {
  if (by === "perUnit" && o.perUnit != null) return `${rupee(o.perUnit)}/pc`;
  if (o.perKg != null) return `${rupee(o.perKg)}/${o.volume ? "L" : "kg"}`;
  if (o.perUnit != null) return `${rupee(o.perUnit)}/pc`;
  return null;
}

export function verdictLabel(o: Offer): { text: string; tone: Verdict } {
  const d = o.deal;
  if (!d || d.verdict === "unknown") return { text: "no history yet", tone: "unknown" };
  const pct = d.pctVsTypical;
  const p = pct == null ? "" : `${Math.abs(Math.round(pct))}% `;
  if (d.verdict === "deal") return { text: d.newLow ? "new all-time low" : `deal · ${p}below usual`, tone: "deal" };
  if (d.verdict === "pricier") return { text: `${p}above usual`, tone: "pricier" };
  return { text: "usual price", tone: "normal" };
}

export const REASONS: Record<string, string> = {
  no_self_agent_id: "no Self Agent ID",
  not_a_verified_human_backed_agent: "not backed by a verified human",
};
export const reasonLabel = (r?: string) => (r ? (REASONS[r] ?? r.replace(/_/g, " ")) : "refused");
