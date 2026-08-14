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

// Rounds a weight up to the nearest whole kg for BILLING purposes — this
// is the actual slab rule: 0.3kg, 0.6kg, and exactly 1.0kg all bill as
// 1kg; 1.01kg through 2.0kg all bill as 2kg; and so on. Math.ceil() on any
// weight greater than 0 and up to 1 always returns 1, so this also gives
// every non-empty order a 1kg minimum for free, with no extra clamping.
function billedWeightKg(weightKg: number): number {
  return Math.ceil(weightKg);
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
  // Round the WEIGHT up to its billing slab first, then multiply by the
  // per-kg rate — not the other way around. Rounding the final cost
  // instead (the previous bug) collapsed the whole slab system down to a
  // plain per-kg fee: 0.3kg billed as ₹15 instead of the full 1kg-slab
  // rate of ₹50, since Math.ceil(0.3 × 50) just rounds 15 up to 15.
  const cost = billedWeightKg(totalWeightKg) * ratePerKg;
  return { zone, ratePerKg, cost };
}

export function estimateProductShipping(weightKg: number): { punjab: number; india: number } {
  const slabWeight = billedWeightKg(weightKg);
  return {
    punjab: slabWeight * SHIPPING_RATE_PUNJAB_PER_KG,
    india: slabWeight * SHIPPING_RATE_INDIA_PER_KG,
  };
}