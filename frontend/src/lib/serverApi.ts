import { Product } from "@/src/types";
import { Category } from "@/src/lib/categories";
import { FlashDeal } from "@/src/lib/flashDeal";
import { Testimonial } from "@/src/lib/reviews";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function fetchProductsServer(): Promise<Product[]> {
  const res = await fetch(`${BACKEND_URL}/api/products`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load products.");
  return res.json();
}

export async function fetchProductBySlugServer(slug: string): Promise<Product | null> {
  const res = await fetch(`${BACKEND_URL}/api/products/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load product.");
  return res.json();
}

export async function fetchCategoriesServer(): Promise<Category[]> {
  const res = await fetch(`${BACKEND_URL}/api/categories`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load categories.");
  return res.json();
}

export async function fetchCategoryBySlugServer(slug: string): Promise<Category | null> {
  const categories = await fetchCategoriesServer();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function fetchCurrentFlashDealServer(): Promise<FlashDeal | null> {
  const res = await fetch(`${BACKEND_URL}/api/flash-deal`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchTestimonialsServer(): Promise<Testimonial[]> {
  const res = await fetch(`${BACKEND_URL}/api/reviews/testimonials`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}