export const MIN_PROMO_PERCENT = 0.01;
export const MAX_PROMO_PERCENT = 100;

export function normalizePromoPercent(value: unknown): number | null {
  const percent = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(percent) || percent < MIN_PROMO_PERCENT || percent > MAX_PROMO_PERCENT) {
    return null;
  }

  return Math.round(percent * 100) / 100;
}