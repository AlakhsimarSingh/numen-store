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
}: {
  subtotal: number;
  discountPercent: number;
  paymentMethod?: "card" | "upi" | "cod" | null;
  settings?: OrderSettings;
}) {
  const s: OrderSettings = settings ?? {
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    shippingFee: SHIPPING_FEE,
    taxRate: TAX_RATE,
    codFee: COD_FEE,
  };
  const discount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const discounted = Math.max(0, subtotal - discount);
  const shippingFee = discounted === 0 || discounted >= s.freeShippingThreshold ? 0 : s.shippingFee;
  const tax = Math.round(discounted * s.taxRate * 100) / 100;
  const codFee = paymentMethod === "cod" ? s.codFee : 0;
  const total = Math.round((discounted + shippingFee + tax + codFee) * 100) / 100;
  return { discount, shippingFee, tax, codFee, total };
}