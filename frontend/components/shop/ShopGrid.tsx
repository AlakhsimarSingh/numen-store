"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Product } from "@/src/types";
import { Category } from "@/src/lib/categories";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { getDisplayPrice } from "@/src/lib/currency";
import ProductCard from "@/components/ProductCard";
import { buildPriceBands } from "@/src/lib/priceBands";
import { DesktopFilterAside, MobileFilterButton } from "@/components/shop/FilterSidebar";
import { SortMenu, type SortOption } from "@/components/shop/SortMenu";

type SortKey =
  | "featured"
  | "new-to-old"
  | "old-to-new"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "discount"
  | "name-asc";

const SORT_OPTIONS: SortOption<SortKey>[] = [
  { value: "featured", label: "Featured" },
  { value: "new-to-old", label: "New to Old" },
  { value: "old-to-new", label: "Old to New" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "discount", label: "Biggest Discount" },
  { value: "name-asc", label: "Name: A to Z" },
];

const SORT_KEYS = SORT_OPTIONS.map((o) => o.value);
function isSortKey(v: string | null): v is SortKey {
  return !!v && (SORT_KEYS as string[]).includes(v);
}

// Rendering all 440+ products at once (each with its own Image + framer
// motion mount) is what was making the page laggy. Paginating keeps the
// live DOM small regardless of catalog size.
const PAGE_SIZE = 46;

export default function ShopGrid({
  initialProducts,
  categories = [],
  showCategoryFilter = false,
}: {
  initialProducts: Product[];
  categories?: Category[];
  showCategoryFilter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get("filter");

  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const symbols = useCurrencyStore((s) => s.symbols);
  const symbol = symbols[currency] ?? currency;

  // Every filter/sort now initializes straight from the URL on first
  // render, so a pasted link reproduces the exact same view immediately —
  // no flash of the default state before a useEffect corrects it.
  const [sortBy, setSortByState] = useState<SortKey>(() => {
    const s = searchParams.get("sort");
    return isSortKey(s) ? s : "featured";
  });
  const [activeCategory, setActiveCategoryState] = useState<string | "all">(
    () => searchParams.get("category") ?? "all"
  );
  const [activeSizes, setActiveSizesState] = useState<string[]>(() => {
    const s = searchParams.get("sizes");
    return s ? s.split(",").filter(Boolean) : [];
  });
  const [priceBand, setPriceBandState] = useState(() => {
    const p = parseInt(searchParams.get("price") ?? "0", 10);
    return Number.isFinite(p) && p >= 0 ? p : 0;
  });
  const [newOnly, setNewOnlyState] = useState(
    () => searchParams.get("filter") === "new" || searchParams.get("new") === "1"
  );
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get("page") ?? "1", 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  });

  useEffect(() => {
    if (urlFilter === "new") setNewOnlyState(true);
  }, [urlFilter]);

  // Single place that writes to the URL — every filter setter below calls
  // this with just the key(s) it owns, so the query string always mirrors
  // current state without each setter needing to rebuild the whole thing.
  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setSortBy(v: SortKey) {
    setSortByState(v);
    updateParams({ sort: v === "featured" ? null : v });
  }

  function setActiveCategory(slug: string) {
    setActiveCategoryState(slug);
    updateParams({ category: slug === "all" ? null : slug });
  }

  function toggleSize(size: string) {
    setActiveSizesState((prev) => {
      const next = prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size];
      updateParams({ sizes: next.length > 0 ? next.join(",") : null });
      return next;
    });
  }

  function setPriceBand(i: number) {
    setPriceBandState(i);
    updateParams({ price: i === 0 ? null : String(i) });
  }

  function setNewOnly(v: boolean) {
    setNewOnlyState(v);
    // "filter=new" is the pre-existing param other pages (e.g. a homepage
    // "New Drops" link) already generate — keep writing to that same key
    // rather than introducing a second, redundant "new=1" param.
    updateParams({ filter: v ? "new" : null });
  }

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    for (const p of initialProducts) p.sizes?.forEach((s) => set.add(s));
    return Array.from(set).sort();
  }, [initialProducts]);

  // The backend already returns products ordered newest-first
  // (orderBy: { createdAt: "desc" }) — but that raw createdAt date isn't
  // exposed on the Product type sent to the frontend. Rather than sort by
  // a field that doesn't exist, this captures each product's position in
  // the array AS RECEIVED as a stand-in for recency: index 0 is newest.
  // This only stays correct as long as the backend keeps that ordering
  // and nothing reorders initialProducts before it reaches this
  // component. If that's ever not guaranteed, ask for createdAt to be
  // added to serializeProduct() instead and this can sort on the real
  // date directly.
  const recencyRankById = useMemo(() => {
    const map: Record<string, number> = {};
    initialProducts.forEach((p, i) => {
      map[p.id] = i;
    });
    return map;
  }, [initialProducts]);

  // Every product's price+compareAt resolved to the currently displayed
  // currency (regional override first, then rate conversion, INR
  // fallback) — the single source of truth used for band math, sorting,
  // and discount % below, so none of them can drift out of sync with
  // what the customer actually sees on each ProductCard.
  const displayById = useMemo(() => {
    const map: Record<string, { price: number; compareAtPrice?: number }> = {};
    for (const p of initialProducts) {
      map[p.id] = getDisplayPrice(p, currency, rates);
    }
    return map;
  }, [initialProducts, currency, rates]);

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

  // Band thresholds are absolute numbers in the current currency — if the
  // currency changes, a previously-selected index now points at a
  // different, unrelated range (or may not exist at all if the band count
  // changed). Reset to "All prices" rather than silently filtering by a
  // stale cutoff.
  useEffect(() => {
    setPriceBand(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const filtered = useMemo(() => {
    let list = [...initialProducts];

    if (showCategoryFilter && activeCategory !== "all") {
      list = list.filter((p) => p.categorySlug === activeCategory);
    }

    if (activeSizes.length > 0) {
      list = list.filter((p) => p.sizes?.some((s) => activeSizes.includes(s)));
    }

    const band = priceBands[priceBand] ?? priceBands[0];
    list = list.filter((p) => {
      const price = priceById[p.id] ?? 0;
      return price >= band.min && (band.max === null || price < band.max);
    });

    if (newOnly) list = list.filter((p) => p.isNew);

    switch (sortBy) {
      case "new-to-old":
        list.sort((a, b) => (recencyRankById[a.id] ?? 0) - (recencyRankById[b.id] ?? 0));
        break;
      case "old-to-new":
        list.sort((a, b) => (recencyRankById[b.id] ?? 0) - (recencyRankById[a.id] ?? 0));
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
        // "Featured" — spotlight picks first, then new drops, then rating as a tiebreak.
        list.sort((a, b) => Number(b.isSpotlight) - Number(a.isSpotlight) || Number(b.isNew) - Number(a.isNew) || b.rating - a.rating);
    }
    return list;
  }, [
    initialProducts,
    sortBy,
    activeCategory,
    activeSizes,
    priceBand,
    priceBands,
    priceById,
    displayById,
    newOnly,
    showCategoryFilter,
    recencyRankById,
  ]);

  // Any filter/sort change invalidates the current page — jump back to 1
  // rather than risk landing on a now-empty page.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, activeCategory, activeSizes, priceBand, newOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  function goToPage(p: number) {
    const next = Math.min(Math.max(1, p), totalPages);
    setPage(next);
    updateParams({ page: next > 1 ? String(next) : null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters() {
    setActiveCategoryState("all");
    setActiveSizesState([]);
    setPriceBandState(0);
    setNewOnlyState(false);
    updateParams({ category: null, sizes: null, price: null, filter: null });
  }

  const filterProps = {
    categories,
    showCategoryFilter,
    activeCategory,
    onCategoryChange: setActiveCategory,
    availableSizes,
    activeSizes,
    onToggleSize: toggleSize,
    priceBands,
    priceBand,
    onPriceBandChange: setPriceBand,
    newOnly,
    onToggleNewOnly: () => setNewOnly(!newOnly),
    onReset: resetFilters,
    resultCount: filtered.length,
  };

  return (
    <div>
      {newOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 font-body text-xs text-accent w-fit">
          <span>Showing New Drops</span>
          <button onClick={() => setNewOnly(false)} className="font-semibold hover:underline">
            Clear
          </button>
        </div>
      )}

      <div className="lg:flex lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-6">
            <MobileFilterButton {...filterProps} />
            <div className="ml-auto flex items-center gap-3">
              <span className="font-mono text-xs text-muted">{filtered.length} items</span>
              <SortMenu value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <p className="font-body text-sm text-muted">No products match these filters.</p>
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
    </div>
  );
}