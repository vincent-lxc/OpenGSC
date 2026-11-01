// Serper call budget for rank checks (ops safeguard, 2026-11-01).
//
// Two optional env knobs, both off when unset (behaviour unchanged):
//   SERPER_RANK_MAX_DEPTH      10..50 — deepest Serper scan a rank check may ask for (10 results
//                              = 1 paid call). The smart window and the miss escalation both
//                              stop here. A miss at this depth is NOT trusted as "not ranking"
//                              (trust still needs the provider's real max), so a known rank is kept.
//   SERPER_MAX_CALLS_PER_RUN   cap on Serper calls in a rolling window (default = the 20h stale
//                              window, so the hourly scheduler cannot re-spend it). Counted from
//                              ProviderCall at the start of a batch plus calls made in the batch.
//   SERPER_CAP_DEFER_HOURS     when the cap stops a batch, skipped keywords get
//                              lastCheckedAt = now + this many hours (no RankCheck row, lastPosition
//                              untouched), so they wait for the next round instead of being
//                              backfilled. 0/unset = leave them as they are.

export const SERPER_BUDGET_ERROR = "serper_budget_cap";

function intEnv(name: string, env: Record<string, string | undefined>): number | null {
  const raw = (env[name] ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export function serperRankMaxDepth(providerMax: number, env: Record<string, string | undefined> = process.env): number {
  const d = intEnv("SERPER_RANK_MAX_DEPTH", env);
  if (d == null || d < 10) return providerMax;
  return Math.min(providerMax, Math.floor(d / 10) * 10);
}

export function serperCallCap(env: Record<string, string | undefined> = process.env): number | null {
  const c = intEnv("SERPER_MAX_CALLS_PER_RUN", env);
  return c == null || c <= 0 ? null : c;
}

export function serperCapDeferMs(env: Record<string, string | undefined> = process.env): number {
  return (intEnv("SERPER_CAP_DEFER_HOURS", env) ?? 0) * 60 * 60 * 1000;
}

/** Paid Serper calls for one scan at `depth` (one per 10 results, max 5). */
export function serperPages(depth: number): number {
  return Math.min(5, Math.max(1, Math.ceil(depth / 10)));
}

/** Worst case for one keyword: the smart window plus, if it can escalate, the full-depth rescan. */
export function serperWorstCasePages(lastPosition: number | null, max: number, buffer = 20): number {
  const depth = lastPosition ? Math.min(max, Math.ceil((lastPosition + buffer) / 10) * 10) : max;
  return serperPages(depth) + (depth < max ? serperPages(max) : 0);
}

export class SerperBudget {
  constructor(readonly cap: number, public used: number) {}
  get remaining(): number { return Math.max(0, this.cap - this.used); }
  canSpend(n: number): boolean { return this.used + n <= this.cap; }
  /** Reserve n calls; false (and nothing reserved) when that would pass the cap. */
  take(n: number): boolean {
    if (!this.canSpend(n)) return false;
    this.used += n;
    return true;
  }
}
