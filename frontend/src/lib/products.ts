import { Product } from "@/src/types";

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Failed to load products.");
  return res.json();
}

export async function createProduct(payload: Record<string, unknown>): Promise<Product> {
  const res = await fetch("/api/products", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create product.");
  return data;
}

export async function updateProduct(idOrSlug: string, updates: Record<string, unknown>): Promise<Product> {
  const res = await fetch(`/api/products/${idOrSlug}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update product.");
  return data;
}

export async function deleteProduct(idOrSlug: string): Promise<void> {
  const res = await fetch(`/api/products/${idOrSlug}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to delete product.");
  }
}
export interface BulkProductRow {
  name?: string;
  categorySlug?: string;
  price?: number | string;
  compareAtPrice?: number | string;
  image?: string;
  images?: string[];
  stock?: number | string;
  sizes?: string[];
  isNew?: boolean;
  isSpotlight?: boolean;
}

export interface BulkCreateResult {
  created: Product[];
  errors: { index: number; name?: string; error: string }[];
  createdCount: number;
  errorCount: number;
}

export async function bulkCreateProducts(products: BulkProductRow[]): Promise<BulkCreateResult> {
  const res = await fetch("/api/products/bulk", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ products }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Bulk import failed.");
  return data;
}