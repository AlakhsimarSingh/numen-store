import type { Metadata } from "next";
import { fetchProductsServer, fetchCategoriesServer } from "@/src/lib/serverApi";
import ShopGrid from "@/components/shop/ShopGrid";

// Was `force-dynamic`, which re-fetches and re-renders on literally every
// request with no caching at all — with 440+ products that's a lot of
// unnecessary work on every hit, and it also blocks any CDN/edge caching
// that would otherwise make this fast for crawlers and repeat visitors.
// ISR serves a cached version and silently rebuilds in the background at
// most once every 5 minutes, which is plenty fresh for a catalog listing.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shop All — NUMEN.",
  description: "Browse the full NUMEN catalog — premium fits across every category, new drops weekly.",
};

export default async function ShopPage() {
  const [products, categories] = await Promise.all([fetchProductsServer(), fetchCategoriesServer()]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">Full Catalog</p>
      <h1 className="mb-8 font-display text-3xl font-bold text-ink sm:text-4xl">All Products</h1>
      <ShopGrid initialProducts={products} categories={categories} showCategoryFilter />
    </div>
  );
}