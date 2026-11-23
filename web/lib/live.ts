// Server-side snapshot of Bhav's live stats (GET /v1/stats), shared by every visitor and
// refreshed about every 30 s. Never throws: if the API is down (including at build time),
// it returns null and the page shows an "API offline" state. The browser then keeps it
// fresh on its own.
import { cacheLife } from "next/cache";
import { API_BASE } from "./bhav";
import { isStats, type Stats } from "./api";

export async function getStats(): Promise<Stats | null> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 900 });
  try {
    const r = await fetch(`${API_BASE}/v1/stats`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const j: unknown = await r.json();
    return isStats(j) ? j : null;
  } catch {
    return null;
  }
}
