import { Product } from "@/src/types";

export async function fetchWishlist(): Promise<{ productIds: string[]; products: Product[] }> {
  const res = await fetch("/api/wishlist", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load wishlist.");
  return res.json();
}

export async function toggleWishlistItem(productId: string): Promise<{ wishlisted: boolean }> {
  const res = await fetch("/api/wishlist", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  if (!res.ok) throw new Error("Failed to update wishlist.");
  return res.json();
}