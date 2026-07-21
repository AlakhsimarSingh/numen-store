"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Product } from "@/src/types";
import { Category } from "@/src/lib/categories";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { getDisplayPrice } from "@/src/lib/currency";
import { buildSearchIndex, searchProducts } from "@/src/lib/search";
import { buildPriceBands } from "@/src/lib/priceBands";
import ProductCard from "@/components/ProductCard";
import { DesktopFilterAside, MobileFilterButton } from "@/components/shop/FilterSidebar";
import { SortMenu, type SortOption } from "@/components/shop/SortMenu";

type SortKey = "relevance" | "newest" | "price-asc" | "price-desc" | "rating" | "discount" | "name-asc";

const SORT_OPTIONS: SortOption<SortKey>[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "discount", label: "Biggest Discount" },
  { value: "name-asc", label: "Name: A to Z" },
];

const PAGE_SIZE = 24;

export default function SearchResultsGrid({
  initialProducts,
  categories = [],
  initialQuery,
}: {
  initialProducts: Product[];
  categories?: Category[];
  initialQuery: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<SortKey>("relevance");
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [activeSizes, setActiveSizes] = useState<string[]>([]);
  const [priceBand, setPriceBand] = useState(0);
  const [newOnly, setNewOnly] = useState(false);
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get("page") ?? "1", 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  });

  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const symbols = useCurrencyStore((s) => s.symbols);
  const symbol = symbols[currency] ?? currency;

  const searchIndex = useMemo(() => buildSearchIndex(initialProducts), [initialProducts]);

  const q = query.trim();
  // Unbounded limit here (vs. the 8-item cap used in the dropdown preview)
  // — this page's whole job is showing the complete matching set.
  const matched = useMemo(() => {
    if (q.length === 0) return [];
    return searchProducts(q, initialProducts, searchIndex, initialProducts.length);
  }, [q, initialProducts, searchIndex]);

  const matchedProducts = useMemo(() => matched.map((r) => r.product), [matched]);

  function toggleSize(size: string) {
    setActiveSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  }

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    for (const p of matchedProducts) p.sizes?.forEach((s) => set.add(s));
    return Array.from(set).sort();
  }, [matchedProducts]);

  const displayById = useMemo(() => {
    const map: Record<string, { price: number; compareAtPrice?: number }> = {};
    for (const p of matchedProducts) {
      map[p.id] = getDisplayPrice(p, currency, rates);
    }
    return map;
  }, [matchedProducts, currency, rates]);

  const priceById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const id in displayById) map[id] = displayById[id].price;
    return map;
  }, [displayById]);

  function discountRatio(p: Product) {
    const d = displayById[p.id];
    if (!d?.compareAtPrice || d.compareAtPrice <= d.price) return -1;
    return (d.compareAtPrice - d.price) / d.compareAtPrice;
  }

  const priceBands = useMemo(
    () => buildPriceBands(Object.values(priceById), currency, symbol),
    [priceById, currency, symbol]
  );

  useEffect(() => {
    setPriceBand(0);
  }, [currency]);

  const filtered = useMemo(() => {
    let list = [...matchedProducts];

    if (activeCategory !== "all") {
      list = list.filter((p) => p.categorySlug === activeCategory);
    }
    if (activeSizes.length > 0) {
      list = list.filter((p) => p.sizes?.some((s) => activeSizes.includes(s)));
    }

    const band = priceBands[priceBand] ?? priceBands[0];
    if (band) {
      list = list.filter((p) => {
        const price = priceById[p.id] ?? 0;
        return price >= band.min && (band.max === null || price < band.max);
      });
    }

    if (newOnly) list = list.filter((p) => p.isNew);

    switch (sortBy) {
      case "newest":
        list.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.rating - a.rating);
        break;
      case "price-asc":
        list.sort((a, b) => (priceById[a.id] ?? 0) - (priceById[b.id] ?? 0));
        break;
      case "price-desc":
        list.sort((a, b) => (priceById[b.id] ?? 0) - (priceById[a.id] ?? 0));
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "discount":
        list.sort((a, b) => discountRatio(b) - discountRatio(a));
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break; // "relevance" — keep Fuse's match-quality order from searchProducts
    }
    return list;
  }, [
    matchedProducts,
    activeCategory,
    activeSizes,
    priceBand,
    priceBands,
    priceById,
    displayById,
    newOnly,
    sortBy,
  ]);

  useEffect(() => {
    setPage(1);
  }, [q, sortBy, activeCategory, activeSizes, priceBand, newOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  function updateUrl(nextQuery: string, nextPage: number) {
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function goToPage(p: number) {
    const next = Math.min(Math.max(1, p), totalPages);
    setPage(next);
    updateUrl(q, next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateUrl(query.trim(), 1);
  }

  function resetFilters() {
    setActiveCategory("all");
    setActiveSizes([]);
    setPriceBand(0);
    setNewOnly(false);
  }

  const filterProps = {
    categories,
    showCategoryFilter: true,
    activeCategory,
    onCategoryChange: setActiveCategory,
    availableSizes,
    activeSizes,
    onToggleSize: toggleSize,
    priceBands,
    priceBand,
    onPriceBandChange: setPriceBand,
    newOnly,
    onToggleNewOnly: () => setNewOnly((v) => !v),
    onReset: resetFilters,
    resultCount: filtered.length,
  };

  return (
    <div>
      <form onSubmit={handleSearchSubmit} className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-surface px-5 py-3.5">
        <Search size={18} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, categories, colors, sizes…"
          className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </form>

      {q.length === 0 ? (
        <p className="py-16 text-center font-body text-sm text-muted">Start typing above to search the catalog.</p>
      ) : (
        <div className="lg:flex lg:items-start lg:gap-8">
          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-6">
              <MobileFilterButton {...filterProps} />
              <div className="ml-auto flex items-center gap-3">
                <span className="font-mono text-xs text-muted">{filtered.length} results</span>
                <SortMenu value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <p className="font-body text-sm text-muted">
                  No products match &ldquo;{query}&rdquo; with these filters.
                </p>
                <button
                  onClick={resetFilters}
                  className="rounded-full border border-accent/40 px-4 py-1.5 font-body text-xs text-accent hover:bg-accent hover:text-bg"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {pageItems.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: (i % 8) * 0.05 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      onClick={() => goToPage(clampedPage - 1)}
                      disabled={clampedPage <= 1}
                      className="rounded-full border border-white/10 px-4 py-1.5 font-mono text-xs text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="font-mono text-xs text-muted">
                      Page {clampedPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => goToPage(clampedPage + 1)}
                      disabled={clampedPage >= totalPages}
                      className="rounded-full border border-white/10 px-4 py-1.5 font-mono text-xs text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <DesktopFilterAside {...filterProps} />
        </div>
      )}
    </div>
  );
}