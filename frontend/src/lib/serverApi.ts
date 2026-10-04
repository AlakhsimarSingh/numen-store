import { Product } from "@/src/types";
import { Category } from "@/src/lib/categories";
import { FlashDeal } from "@/src/lib/flashDeal";
import { Testimonial } from "@/src/lib/reviews";
import { CACHE_TAGS } from "@/src/data/cacheTags";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

/**
 * Every call used to be `cache: "no-store"`, which forces the homepage to be
 * rendered from scratch on EVERY request and blocks the HTML on the slowest
 * backend call. Now responses are cached by Next and revalidated in the
 * background (stale-while-revalidate), so visitors get an instant page and
 * a slow/failed backend call never blocks them.
 *
 * Tags (src/data/cacheTags.ts) let the backend bust the cache immediately
 * after an admin edit via POST /api/revalidate.
 */

export async function fetchProductsServer(): Promise<Product[]> {
  const res = await fetch(`${BACKEND_URL}/api/products`, {
    next: { revalidate: 60, tags: [CACHE_TAGS.products] },
  });
  if (!res.ok) throw new Error("Failed to load products.");
  return res.json();
}

export async function fetchProductBySlugServer(slug: string): Promise<Product | null> {
  const res = await fetch(`${BACKEND_URL}/api/products/${slug}`, {
    next: { revalidate: 60, tags: [CACHE_TAGS.products, `product:${slug}`] },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load product.");
  return res.json();
}

export async function fetchCategoriesServer(): Promise<Category[]> {
  const res = await fetch(`${BACKEND_URL}/api/categories`, {
    next: { revalidate: 60, tags: [CACHE_TAGS.categories] },
  });
  if (!res.ok) throw new Error("Failed to load categories.");
  return res.json();
}

export async function fetchCategoryBySlugServer(slug: string): Promise<Category | null> {
  const categories = await fetchCategoriesServer();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function fetchCurrentFlashDealServer(): Promise<FlashDeal | null> {
  const res = await fetch(`${BACKEND_URL}/api/flash-deal`, {
    next: { revalidate: 30, tags: [CACHE_TAGS.flashDeal] },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchTestimonialsServer(): Promise<Testimonial[]> {
  const res = await fetch(`${BACKEND_URL}/api/reviews/testimonials`, {
    next: { revalidate: 300, tags: [CACHE_TAGS.testimonials] },
  });
  if (!res.ok) return [];
  return res.json();
}