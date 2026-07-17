import { Product, CurrencyCode } from "@/src/types";

const LOCALE_COUNTRY_MAP: Record<string, CurrencyCode> = {
  IN: "INR",
  GB: "GBP",
  UK: "GBP",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR", PT: "EUR",
  US: "USD",
  AE: "AED",
  CA: "CAD",
  AU: "AUD",
  SG: "SGD",
};

export function detectCurrencyFromLocale(locale: string): CurrencyCode {
  const parts = locale.split("-");
  const country = parts[1]?.toUpperCase();
  if (country && LOCALE_COUNTRY_MAP[country]) return LOCALE_COUNTRY_MAP[country];
  return "USD";
}

export async function detectCurrencyFromIP(): Promise<CurrencyCode | null> {
  try {
    const res = await fetch("https://ipwho.is/");
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success) return null;
    const countryCode = data.country_code as string | undefined;
    return (countryCode && LOCALE_COUNTRY_MAP[countryCode]) ?? null;
  } catch {
    return null;
  }
}

/**
 * Base currency is INR. `rates` maps a currency code to "1 <code> = X INR"
 * (e.g. USD: 83.5 means $1 = ₹83.5) — the natural direction for an
 * India-based store, and what the admin panel now asks for directly.
 */
export function getDisplayPrice(
  product: Pick<Product, "price" | "compareAtPrice" | "regionalPrices">,
  currency: CurrencyCode,
  rates: Record<string, number>
): { price: number; compareAtPrice?: number; estimated: boolean } {
  const explicit = product.regionalPrices?.[currency];
  if (explicit) {
    return { price: explicit.price, compareAtPrice: explicit.compareAtPrice, estimated: false };
  }
  if (currency === "INR") {
    return { price: product.price, compareAtPrice: product.compareAtPrice, estimated: false };
  }


  const rate = rates[currency];
  if (!rate || rate <= 0) {
    // No rate configured for this currency — show INR rather than divide by zero/garbage.
    return { price: product.price, compareAtPrice: product.compareAtPrice, estimated: false };
  }

  return {
    price: Math.round((product.price / rate) * 100) / 100,
    compareAtPrice: product.compareAtPrice ? Math.round((product.compareAtPrice / rate) * 100) / 100 : undefined,
    estimated: true,
  };
}

/** Display name only (e.g. "US Dollar") — the SYMBOL comes from the admin-set value, not this. */
export function getCurrencyLabel(code: CurrencyCode): string {
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "currency" });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

export function formatMoney(amount: number, currency: CurrencyCode, symbol: string): string {
  const decimals = currency === "INR" ? 0 : 2;
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `${symbol}${formattedNumber}`;
}
/**
 * Converts a flat, INR-denominated amount (shipping fee, free-shipping
 * threshold, COD fee — none of which have a per-currency override in
 * SiteSettings) into the target display currency using the same rate
 * table as product pricing. Falls back to the raw INR amount if no rate
 * is configured, same policy as getDisplayPrice.
 */
export function convertBaseAmount(
  amountInINR: number,
  currency: CurrencyCode,
  rates: Record<string, number>
): number {
  if (currency === "INR") return amountInINR;
  const rate = rates[currency];
  if (!rate || rate <= 0) return amountInINR;
  return Math.round((amountInINR / rate) * 100) / 100;
}