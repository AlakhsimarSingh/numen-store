import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { convertBaseAmount, formatMoney } from "@/src/lib/currency";

/**
 * Formats an INR-denominated base amount (order totals, item prices, etc.)
 * in whatever currency is currently active in the navbar's CurrencySwitcher
 * — same rate table and symbol source used for product pricing.
 */
export function useFormatPrice() {
  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const symbols = useCurrencyStore((s) => s.symbols);

  return (amountInINR: number) => {
    const converted = convertBaseAmount(amountInINR, currency, rates);
    return formatMoney(converted, currency, symbols[currency] ?? "");
  };
}