import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { getDisplayPrice, formatMoney } from "@/src/lib/currency";
import { Product } from "@/src/types";

export function useProductPrice(product: Pick<Product, "price" | "compareAtPrice" | "regionalPrices">) {
  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const symbols = useCurrencyStore((s) => s.symbols);
  const display = getDisplayPrice(product, currency, rates);
  const symbol = symbols[currency] ?? currency;
  return {
    ...display,
    currency,
    formattedPrice: formatMoney(display.price, currency, symbol),
    formattedCompareAt: display.compareAtPrice ? formatMoney(display.compareAtPrice, currency, symbol) : undefined,
  };
}