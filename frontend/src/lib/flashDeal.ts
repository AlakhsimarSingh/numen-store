import { Product } from "@/src/types";

export interface FlashDeal {
  id: string;
  label: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  product: Product;
}

export async function fetchCurrentFlashDeal(): Promise<FlashDeal | null> {
  const res = await fetch("/api/flash-deal");
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAllFlashDeals(): Promise<FlashDeal[]> {
  const res = await fetch("/api/admin/flash-deals", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load flash deals.");
  return res.json();
}

export async function createFlashDeal(payload: {
  productId: string;
  label?: string;
  startsAt: string;
  endsAt: string;
}): Promise<FlashDeal> {
  const res = await fetch("/api/flash-deal", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create flash deal.");
  return data;
}

export async function updateFlashDeal(id: string, updates: Record<string, unknown>): Promise<FlashDeal> {
  const res = await fetch(`/api/flash-deal/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update flash deal.");
  return data;
}

export async function deleteFlashDeal(id: string): Promise<void> {
  const res = await fetch(`/api/flash-deal/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error("Failed to delete flash deal.");
}