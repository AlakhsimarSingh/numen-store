import { Product, CurrencyCode } from "@/src/types";

const LOCALE_COUNTRY_MAP: Record<string, CurrencyCode> = {
  IN: "INR",
  GB: "GBP",
  UK: "GBP",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR", PT: "EUR",
  US: "USD",
};

export function detectCurrencyFromLocale(locale: string): CurrencyCode {
  const parts = locale.split("-");
  const country = parts[1]?.toUpperCase();
  if (country && LOCALE_COUNTRY_MAP[country]) return LOCALE_COUNTRY_MAP[country];
  return "USD"; // storefront default stays USD unless detected/user-picked
}

/**
 * Base currency is INR: Product.price / compareAtPrice are stored in INR.
 * `rates` maps other currency codes to "1 INR = X <code>".
 */
export function getDisplayPrice(
  product: Pick<Product, "price" | "compareAtPrice" | "regionalPrices">,
  currency: CurrencyCode,
  rates: Record<string, number>
): { price: number; compareAtPrice?: number; estimated: boolean } {
  if (currency === "INR") {
    return { price: product.price, compareAtPrice: product.compareAtPrice, estimated: false };
  }

  const explicit = product.regionalPrices?.[currency];
  if (explicit) {
    return { price: explicit.price, compareAtPrice: explicit.compareAtPrice, estimated: false };
  }

  const rate = rates[currency] ?? 1;
  return {
    price: Math.round(product.price * rate * 100) / 100,
    compareAtPrice: product.compareAtPrice ? Math.round(product.compareAtPrice * rate * 100) / 100 : undefined,
    estimated: true,
  };
}

/** Derives symbol/label for ANY ISO 4217 code via Intl — no hardcoded list needed. */
export function getCurrencyMeta(code: CurrencyCode): { symbol: string; label: string; locale: string } {
  let symbol = code;
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "symbol",
    }).formatToParts(0);
    symbol = parts.find((p) => p.type === "currency")?.value ?? code;
  } catch {
    // invalid/unrecognized ISO code — fall back to showing the raw code
  }
  let label = code;
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "currency" });
    label = dn.of(code) ?? code;
  } catch {
    // Intl.DisplayNames unsupported in this runtime — fall back to the code
  }
  return { symbol, label, locale: code === "INR" ? "en-IN" : "en-US" };
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const meta = getCurrencyMeta(currency);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "INR" ? 0 : 2,
      maximumFractionDigits: currency === "INR" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${meta.symbol}${amount.toFixed(2)}`;
  }
}