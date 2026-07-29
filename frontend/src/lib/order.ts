import { CurrencyCode } from "@/src/types";
import { convertBaseAmount } from "@/src/lib/currency";
import { calculateShippingCost, ShippingZone } from "@/src/lib/shipping";

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
  totalWeightKg,
  destinationPincode,
}: {
  subtotal: number;
  discountPercent: number;
  paymentMethod?: "card" | "upi" | "cod" | null;
  settings?: OrderSettings;
  currency?: CurrencyCode;
  rates?: Record<string, number>;
  /**
   * Combined weight (kg) of the cart/order. When provided, shipping is
   * computed from weight × destination-zone rate instead of the flat
   * SiteSettings shippingFee. Omit to keep the old flat-fee behavior.
   */
  totalWeightKg?: number;
  /** Destination postal code — resolves Punjab vs rest-of-India rate. */
  destinationPincode?: string | null;
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

  let shippingFee = 0;
  let shippingZone: ShippingZone | null = null;

  if (discounted > 0 && discounted < freeShippingThreshold) {
    if (typeof totalWeightKg === "number") {
      const estimate = calculateShippingCost(totalWeightKg, destinationPincode);
      shippingZone = estimate.zone;
      shippingFee = convertBaseAmount(estimate.cost, currency, rates);
    } else {
      shippingFee = shippingFeeAmount;
    }
  }

  const tax = Math.round(discounted * s.taxRate * 100) / 100;
  const codFee = paymentMethod === "cod" ? codFeeAmount : 0;
  const total = Math.round((discounted + shippingFee + tax + codFee) * 100) / 100;
  return { discount, shippingFee, tax, codFee, total, shippingZone };
}