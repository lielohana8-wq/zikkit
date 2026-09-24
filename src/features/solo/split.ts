import type { BusinessConfig, Closing } from '@/types';

/**
 * Revenue split.
 *
 * Some jobs are our own (we keep everything); others are pulled from another
 * company that takes a cut. The percentage lives on the JOB, not in settings,
 * because it changes from company to company — settings only supply the default.
 *
 * `materialsBeforeSplit` decides whether parts come off the top (we and the
 * company split what's left) or off our own share afterwards.
 */
export interface SplitInput {
  amount: number;
  materials?: number;
  sharePercent?: number;         // what WE keep, 0-100. undefined/100 → our own job
  materialsBeforeSplit?: boolean;
}

export interface SplitResult {
  gross: number;
  materials: number;
  /** Amount the split is applied to. */
  base: number;
  sharePercent: number;
  /** Our cut, after materials if they come off our side. */
  ourShare: number;
  /** What the other company keeps. 0 on our own jobs. */
  companyShare: number;
  /** True when nobody else takes a cut. */
  isOwnJob: boolean;
}

const r2 = (n: number) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;

export function computeSplit(input: SplitInput): SplitResult {
  const gross = r2(input.amount);
  const materials = r2(input.materials || 0);
  const pctRaw = input.sharePercent;
  const sharePercent = pctRaw == null ? 100 : Math.max(0, Math.min(100, Number(pctRaw) || 0));
  const beforeSplit = input.materialsBeforeSplit !== false; // default: off the top
  const isOwnJob = sharePercent >= 100;

  const base = beforeSplit ? Math.max(0, gross - materials) : gross;
  const ourGross = r2(base * (sharePercent / 100));
  const ourShare = r2(beforeSplit ? ourGross : ourGross - materials);
  const companyShare = r2(base - ourGross);

  return { gross, materials, base: r2(base), sharePercent, ourShare, companyShare, isOwnJob };
}

/** Defaults a new job/closing starts from. */
export function splitDefaults(cfg: BusinessConfig): { sharePercent: number; materialsBeforeSplit: boolean } {
  return {
    sharePercent: cfg.default_share_percent == null ? 100 : Number(cfg.default_share_percent),
    materialsBeforeSplit: cfg.materials_before_split !== false,
  };
}

/** The split of a stored closing — uses the numbers frozen at save time when present. */
export function splitOf(x: Closing): SplitResult {
  const live = computeSplit({ amount: x.amount, materials: x.materials, sharePercent: x.sharePercent, materialsBeforeSplit: x.materialsBeforeSplit });
  if (x.ourShare == null) return live;
  return { ...live, ourShare: r2(x.ourShare), companyShare: r2(x.companyShare ?? live.companyShare) };
}

export const OWN_SOURCE = 'My own';

/** Source list for pickers: settings + whatever has actually been used. */
export function sourcesFrom(cfg: BusinessConfig, closings: Closing[], jobs: Array<{ source?: string }> = []): string[] {
  const used = [...closings.map((x) => x.source), ...jobs.map((j) => j.source)].filter((s): s is string => Boolean(s && s !== OWN_SOURCE));
  return Array.from(new Set([...(cfg.job_sources || []), ...used])).sort((a, b) => a.localeCompare(b));
}
