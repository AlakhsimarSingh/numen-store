import { Product } from "@/src/types";

// Reads a fetch Response as text first, then attempts to parse it as JSON,
// instead of calling res.json() directly. res.json() throws its own raw
// parse error (e.g. "Unexpected token 'A'...") if the body isn't valid
// JSON at all — which happens whenever the server returns something other
// than our own API's response, most commonly a platform-level timeout or
// crashed-function error page. That raw parse error explains nothing to
// whoever reads it and looks like an application bug when it's usually an
// infra timeout. This surfaces something actually actionable instead, and
// is the single place all the API helpers below funnel through so none of
// them can regress back to the old behavior individually.
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