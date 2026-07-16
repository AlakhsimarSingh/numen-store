import { CurrencyCode } from "@/src/types";
import { convertBaseAmount } from "@/src/lib/currency";

export const FREE_SHIPPING_THRESHOLD = 75;
export const SHIPPING_FEE = 6.99;
export const TAX_RATE = 0.08;
export const COD_FEE = 2;

interface OrderSettings {
  freeShippingThreshold: number;
  shippingFee: number;
  taxRate: number;
  codFee: number;
}

export function computeTotals({
  subtotal,
  discountPercent,
  paymentMethod,
  settings,
  currency = "INR",
  rates = {},
}: {
  subtotal: number;
  discountPercent: number;
  paymentMethod?: "card" | "upi" | "cod" | null;
  settings?: OrderSettings;
  /**
   * The currency `subtotal` is already expressed in (regional-priced or
   * converted upstream, per item). Used only to convert the site's flat
   * INR fees into the same currency so they add up consistently. Tax is a
   * percentage and needs no conversion. Defaults to INR — callers that
   * don't pass this behave exactly as before.
   */
  currency?: CurrencyCode;
  rates?: Record<string, number>;
}) {
  const s: OrderSettings = settings ?? {
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    shippingFee: SHIPPING_FEE,
    taxRate: TAX_RATE,
    codFee: COD_FEE,
  };

  const freeShippingThreshold = convertBaseAmount(s.freeShippingThreshold, currency, rates);
  const shippingFeeAmount = convertBaseAmount(s.shippingFee, currency, rates);
  const codFeeAmount = convertBaseAmount(s.codFee, currency, rates);

  const discount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const discounted = Math.max(0, subtotal - discount);
  const shippingFee = discounted === 0 || discounted >= freeShippingThreshold ? 0 : shippingFeeAmount;
  const tax = Math.round(discounted * s.taxRate * 100) / 100;
  const codFee = paymentMethod === "cod" ? codFeeAmount : 0;
  const total = Math.round((discounted + shippingFee + tax + codFee) * 100) / 100;
  return { discount, shippingFee, tax, codFee, total };
}