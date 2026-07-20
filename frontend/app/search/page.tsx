import type { Metadata } from "next";
import { fetchProductsServer, fetchCategoriesServer } from "@/src/lib/serverApi";
import SearchResultsGrid from "@/components/search/SearchResultsGrid";

// Product data itself doesn't change every second — cache the underlying
// fetch and rebuild at most every 5 minutes instead of hitting the API on
// every single request (that's what `force-dynamic` was doing on the shop
// pages, and part of why they felt slow).
export const revalidate = 300;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  return {
    title: query ? `Search: ${query} — NUMEN.` : "Search — NUMEN.",
    description: query ? `Search results for "${query}" at NUMEN.` : "Search the full NUMEN catalog.",
    // Internal search-result URLs are thin/duplicate content from an SEO
    // standpoint (infinite query-string combinations) — keep them out of
    // the index, but still let crawlers follow links from them to actual
    // product/category pages.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const [products, categories] = await Promise.all([fetchProductsServer(), fetchCategoriesServer()]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">Search</p>
      <h1 className="mb-8 font-display text-3xl font-bold text-ink sm:text-4xl">
        {query ? `Results for “${query}”` : "Search"}
      </h1>
      <SearchResultsGrid initialProducts={products} categories={categories} initialQuery={query} />
    </div>
  );
}