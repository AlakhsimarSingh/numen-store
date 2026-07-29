export const SHIPPING_RATE_PUNJAB_PER_KG = 50;
export const SHIPPING_RATE_INDIA_PER_KG = 150;

const PUNJAB_PIN_MIN = 140000;
const PUNJAB_PIN_MAX = 160099;

export type ShippingZone = "punjab" | "india";

export function getShippingZone(pincode: string | null | undefined): ShippingZone | null {
  if (!pincode) return null;
  const digits = pincode.replace(/\D/g, "");
  if (digits.length !== 6) return null;
  const num = parseInt(digits, 10);
  return num >= PUNJAB_PIN_MIN && num <= PUNJAB_PIN_MAX ? "punjab" : "india";
}

export interface ShippingEstimate {
  zone: ShippingZone | null;
  ratePerKg: number;
  cost: number;
}

export function calculateShippingCost(totalWeightKg: number, pincode?: string | null): ShippingEstimate {
  if (!totalWeightKg || totalWeightKg <= 0) {
    return { zone: null, ratePerKg: 0, cost: 0 };
  }
  const zone = getShippingZone(pincode);
  const ratePerKg = zone === "punjab" ? SHIPPING_RATE_PUNJAB_PER_KG : SHIPPING_RATE_INDIA_PER_KG;
  const cost = Math.ceil(totalWeightKg * ratePerKg);
  return { zone, ratePerKg, cost };
}

export function estimateProductShipping(weightKg: number): { punjab: number; india: number } {
  return {
    punjab: Math.ceil(weightKg * SHIPPING_RATE_PUNJAB_PER_KG),
    india: Math.ceil(weightKg * SHIPPING_RATE_INDIA_PER_KG),
  };
}