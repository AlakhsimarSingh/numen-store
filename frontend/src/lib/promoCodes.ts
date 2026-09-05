export interface PromoCode {
  code: string;
  percent: number;
  active: boolean;
  businessName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  publiclyListed: boolean;
  usageCount: number;
  totalSubtotalINR: number;
}

export interface PartnerListing {
  code: string;
  businessName: string;
  description?: string;
  percent: number;
}

export async function fetchPromoCodes(): Promise<PromoCode[]> {
  const res = await fetch("/api/promo-codes", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load promo codes.");
  return res.json();
}

// Public — powers the customer-facing "connect with a seller" picker at
// checkout. No credentials needed; only publiclyListed active codes come
// back (enforced server-side).
export async function fetchPartners(): Promise<PartnerListing[]> {
  const res = await fetch("/api/promo-codes/partners", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load partners.");
  return res.json();
}

export async function createPromoCode(input: {
  code: string;
  percent: number;
  active?: boolean;
  businessName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  publiclyListed?: boolean;
}): Promise<PromoCode> {
  const res = await fetch("/api/promo-codes", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create promo code.");
  return data;
}

export async function updatePromoCode(
  code: string,
  updates: Partial<
    Pick<
      PromoCode,
      "percent" | "active" | "businessName" | "contactName" | "contactEmail" | "contactPhone" | "description" | "publiclyListed"
    >
  >
): Promise<PromoCode> {
  const res = await fetch(`/api/promo-codes/${code}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update promo code.");
  return data;
}

export async function deletePromoCode(code: string): Promise<void> {
  const res = await fetch(`/api/promo-codes/${code}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to delete promo code.");
  }
}