export interface RegionalPriceEntry {
  price: number;
  compareAtPrice?: number;
}

interface PriceableProduct {
  price: number;
  compareAtPrice?: number | null;
  regionalPrices?: unknown;
}

/**
 * Server-side mirror of frontend/src/lib/currency.ts's getDisplayPrice.
 * MUST stay behaviorally identical (regional override first, then rate
 * conversion, then INR fallback) — this is the version that's actually
 * authoritative, since it runs against DB-fetched product data and DB-
 * fetched rates rather than anything the client sent.
 */
export function getDisplayPriceServer(
  product: PriceableProduct,
  currency: string,
  rates: Record<string, number>
): { price: number; compareAtPrice?: number; estimated: boolean } {
  if (currency === "INR") {
    return { price: product.price, compareAtPrice: product.compareAtPrice ?? undefined, estimated: false };
  }

  const regional = product.regionalPrices as Record<string, RegionalPriceEntry> | null | undefined;
  const explicit = regional?.[currency];
  if (explicit) {
    return { price: explicit.price, compareAtPrice: explicit.compareAtPrice, estimated: false };
  }

  const rate = rates[currency];
  if (!rate || rate <= 0) {
    return { price: product.price, compareAtPrice: product.compareAtPrice ?? undefined, estimated: false };
  }

  return {
    price: Math.round((product.price / rate) * 100) / 100,
    compareAtPrice:
      product.compareAtPrice != null ? Math.round((product.compareAtPrice / rate) * 100) / 100 : undefined,
    estimated: true,
  };
}

/** Mirror of frontend convertBaseAmount — converts a flat INR site-setting amount into the target currency. */
export function convertBaseAmount(amountInINR: number, currency: string, rates: Record<string, number>): number {
  if (currency === "INR") return amountInINR;
  const rate = rates[currency];
  if (!rate || rate <= 0) return amountInINR;
  return Math.round((amountInINR / rate) * 100) / 100;
}