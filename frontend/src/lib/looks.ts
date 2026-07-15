import { Look } from "@/src/types";

export interface LookHotspotInput {
  productId: string;
  xPercent: number;
  yPercent: number;
  defaultColor?: string;
  defaultSize?: string;
  label?: string;
}

export interface LookInput {
  title: string;
  subtitle?: string;
  image: string;
  active: boolean;
  order: number;
  hotspots: LookHotspotInput[];
}

export async function fetchLooks(): Promise<Look[]> {
  const res = await fetch("/api/looks", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load looks.");
  return res.json();
}

export async function createLook(input: LookInput): Promise<Look> {
  const res = await fetch("/api/looks", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create look.");
  return data;
}

export async function updateLook(idOrSlug: string, updates: Partial<LookInput>): Promise<Look> {
  const res = await fetch(`/api/looks/${idOrSlug}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update look.");
  return data;
}

export async function deleteLook(idOrSlug: string): Promise<void> {
  const res = await fetch(`/api/looks/${idOrSlug}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to delete look.");
  }
}