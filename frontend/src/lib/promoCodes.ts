export interface PromoCode {
  code: string;
  percent: number;
  active: boolean;
}

export async function fetchPromoCodes(): Promise<PromoCode[]> {
  const res = await fetch("/api/promo-codes", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load promo codes.");
  return res.json();
}

export async function createPromoCode(input: { code: string; percent: number; active?: boolean }): Promise<PromoCode> {
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

export async function updatePromoCode(code: string, updates: Partial<Pick<PromoCode, "percent" | "active">>): Promise<PromoCode> {
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