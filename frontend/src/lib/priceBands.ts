import { formatMoney } from "@/src/lib/currency";

export interface PriceBand {
  label: string;
  min: number; // inclusive, in the currently displayed currency
  max: number | null; // exclusive; null = no upper bound
}

function percentile(sortedAsc: number[], p: number): number {
  const idx = p * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * frac;
}

/** Rounds to a "nice" number (1/2/2.5/5/10 × a power of ten) — chart-axis-style rounding, so cutoffs read as clean prices rather than raw percentile decimals. Guards against <= 0 by flooring to `minUnit`. */
function niceRound(value: number, minUnit: number): number {
  if (!Number.isFinite(value) || value <= 0) return minUnit;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  const residuals = [1, 2, 2.5, 5, 10];
  let nice = residuals[0];
  let minDiff = Infinity;
  for (const r of residuals) {
    const diff = Math.abs(r - residual);
    if (diff < minDiff) {
      minDiff = diff;
      nice = r;
    }
  }
  const rounded = Math.round(nice * magnitude * 100) / 100;
  return rounded < minUnit ? minUnit : rounded;
}

/** Smallest nice number strictly greater than `value` — used to break a tie when both cutoffs round to the same number. */
function nextNiceAbove(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residuals = [1, 2, 2.5, 5, 10];
  const normalized = value / magnitude;
  for (const r of residuals) {
    if (r * magnitude > value) return r * magnitude;
  }
  return 10 * magnitude; // unreachable in practice — normalized is always < 10
}

/**
 * Splits the catalog into thirds by price (tertiles), rounds the two cutoffs
 * to clean display numbers, and returns bands as half-open ranges
 * (`min <= price < max`) so no product can land in two bands at once.
 * Always operates on prices already resolved to the currently displayed
 * currency (regional override or converted) — never raw INR.
 */
export function buildPriceBands(displayPrices: number[], currency: string, symbol: string): PriceBand[] {
  const valid = displayPrices.filter((p) => Number.isFinite(p) && p >= 0);
  const allPrices: PriceBand = { label: "All prices", min: 0, max: null };

  if (valid.length === 0) return [allPrices];

  const sorted = [...valid].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Every product the same price (or only one product) — a price filter adds no value.
  if (min === max) return [allPrices];

  const minUnit = 1;
  const b1 = niceRound(percentile(sorted, 1 / 3), minUnit);
  const b2raw = niceRound(percentile(sorted, 2 / 3), minUnit);
  const b2 = b2raw <= b1 ? nextNiceAbove(b1) : b2raw;

  return [
    allPrices,
    { label: `Under ${formatMoney(b1, currency, symbol)}`, min: 0, max: b1 },
    { label: `${formatMoney(b1, currency, symbol)} – ${formatMoney(b2, currency, symbol)}`, min: b1, max: b2 },
    { label: `${formatMoney(b2, currency, symbol)}+`, min: b2, max: null },
  ];
}