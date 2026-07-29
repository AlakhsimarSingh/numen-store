import { Product } from "@/src/types";

async function parseJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  const text = await res.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const snippet = text.slice(0, 120).replace(/\s+/g, " ").trim();
      throw new Error(
        `Server returned an unreadable response (HTTP ${res.status}). This usually means the request timed out on the server rather than failing cleanly.` +
          (snippet ? ` Response started with: "${snippet}${text.length > 120 ? "…" : ""}"` : "")
      );
    }
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : fallbackMessage;
    throw new Error(message);
  }

  return data as T;
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products");
  return parseJsonOrThrow<Product[]>(res, "Failed to load products.");
}

export async function createProduct(payload: Record<string, unknown>): Promise<Product> {
  const res = await fetch("/api/products", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<Product>(res, "Failed to create product.");
}

export async function updateProduct(idOrSlug: string, updates: Record<string, unknown>): Promise<Product> {
  const res = await fetch(`/api/products/${idOrSlug}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return parseJsonOrThrow<Product>(res, "Failed to update product.");
}

export async function deleteProduct(idOrSlug: string): Promise<void> {
  const res = await fetch(`/api/products/${idOrSlug}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    await parseJsonOrThrow<never>(res, "Failed to delete product.");
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
  weight?: number | string;
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
  return parseJsonOrThrow<BulkCreateResult>(res, "Bulk import failed.");
}

// ---- Bulk EDIT (grid) support ----

export interface BulkUpdateItem {
  id: string;
  updates: Record<string, unknown>;
}

export interface BulkUpdateResult {
  updated: Product[];
  errors: { id: string; error: string }[];
}

// Same reasoning as bulk delete's chunking: each updateProduct() call is
// its own request, so batching a few at a time keeps any single burst of
// in-flight work comfortably under serverless timeouts while still giving
// the UI a progress checkpoint after every chunk.
const BULK_UPDATE_CHUNK_SIZE = 4;

export async function bulkUpdateProducts(
  items: BulkUpdateItem[],
  onProgress?: (done: number, total: number) => void
): Promise<BulkUpdateResult> {
  const updated: Product[] = [];
  const errors: { id: string; error: string }[] = [];

  for (let i = 0; i < items.length; i += BULK_UPDATE_CHUNK_SIZE) {
    const chunk = items.slice(i, i + BULK_UPDATE_CHUNK_SIZE);
    const results = await Promise.allSettled(chunk.map((it) => updateProduct(it.id, it.updates)));
    results.forEach((res, idx) => {
      if (res.status === "fulfilled") {
        updated.push(res.value);
      } else {
        errors.push({
          id: chunk[idx].id,
          error: res.reason instanceof Error ? res.reason.message : "Update failed",
        });
      }
    });
    onProgress?.(Math.min(i + BULK_UPDATE_CHUNK_SIZE, items.length), items.length);
  }

  return { updated, errors };
}