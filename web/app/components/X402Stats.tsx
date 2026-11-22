// PLACEHOLDER: x402 payment stats. The price service and x402 payments are still being
// built, so there is no data yet. Wire getX402Stats() in lib/live.ts to the real source
// (data source TBD) and this card will render the numbers instead of the notice.
import { getX402Stats } from "@/lib/live";
import { Status } from "./Chrome";

export default async function X402Stats() {
  const s = await getX402Stats();
  if (!s) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">Paid answers over x402</p>
          <Status live={false} />
        </div>
        <p className="mt-2 text-sm text-muted">
          Once the price service is up, this shows paid answers, USDC received on Celo and how many unique humans were
          served. No numbers until they are real.
        </p>
      </div>
    );
  }
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[
        [s.paidAnswers.toLocaleString("en-US"), "paid answers"],
        [`${s.usdcReceived.toFixed(2)} USDC`, "received on Celo"],
        [s.uniqueHumans.toLocaleString("en-US"), "unique humans served"],
      ].map(([v, l]) => (
        <div key={l} className="card p-5">
          <dd className="text-3xl font-medium tracking-tight tabular-nums text-lime">{v}</dd>
          <dt className="mt-1 text-xs text-muted">{l}</dt>
        </div>
      ))}
    </dl>
  );
}
