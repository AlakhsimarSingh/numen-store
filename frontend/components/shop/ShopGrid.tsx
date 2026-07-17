"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { Product } from "@/src/types";
import { Category } from "@/src/lib/categories";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { getDisplayPrice } from "@/src/lib/currency";
import ProductCard from "@/components/ProductCard";
import { cn } from "@/src/lib/utils";
import { buildPriceBands } from "@/src/lib/priceBands";

type SortKey = "featured" | "price-asc" | "price-desc" | "rating";

export default function ShopGrid({
  initialProducts,
  categories = [],
  showCategoryFilter = false,
}: {
  initialProducts: Product[];
  categories?: Category[];
  showCategoryFilter?: boolean;
}) {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get("filter");

  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const symbols = useCurrencyStore((s) => s.symbols);
  const symbol = symbols[currency] ?? currency;

  const [sortBy, setSortBy] = useState<SortKey>("featured");
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [priceBand, setPriceBand] = useState(0);
  const [newOnly, setNewOnly] = useState(urlFilter === "new");

  useEffect(() => {
    if (urlFilter === "new") setNewOnly(true);
  }, [urlFilter]);

  // Every product's price resolved to the currently displayed currency
  // (regional override first, then rate conversion, INR fallback) — the
  // single source of truth used for both band math and sorting below, so
  // neither can drift out of sync with what the customer actually sees on
  // each ProductCard.
  const priceById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of initialProducts) {
      map[p.id] = getDisplayPrice(p, currency, rates).price;
    }
    return map;
  }, [initialProducts, currency, rates]);

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
  }, [currency]);

  const filtered = useMemo(() => {
    let list = [...initialProducts];

    if (showCategoryFilter && activeCategory !== "all") {
      list = list.filter((p) => p.categorySlug === activeCategory);
    }

    const band = priceBands[priceBand] ?? priceBands[0];
    list = list.filter((p) => {
      const price = priceById[p.id] ?? 0;
      return price >= band.min && (band.max === null || price < band.max);
    });

    if (newOnly) list = list.filter((p) => p.isNew);

    switch (sortBy) {
      case "price-asc":
        list.sort((a, b) => (priceById[a.id] ?? 0) - (priceById[b.id] ?? 0));
        break;
      case "price-desc":
        list.sort((a, b) => (priceById[b.id] ?? 0) - (priceById[a.id] ?? 0));
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        list.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    }
    return list;
  }, [initialProducts, sortBy, activeCategory, priceBand, priceBands, priceById, newOnly, showCategoryFilter]);

  function resetFilters() {
    setActiveCategory("all");
    setPriceBand(0);
    setNewOnly(false);
  }

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

      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-4 border-b border-white/5 pb-6">
        {showCategoryFilter && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "rounded-full border px-3.5 py-1.5 font-body text-xs transition-colors",
                activeCategory === "all"
                  ? "border-accent bg-accent text-bg"
                  : "border-white/10 text-muted hover:text-ink"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 font-body text-xs transition-colors",
                  activeCategory === cat.slug
                    ? "border-accent bg-accent text-bg"
                    : "border-white/10 text-muted hover:text-ink"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal size={14} className="mr-1 text-muted" />
            {priceBands.map((band, i) => (
              <button
                key={band.label}
                onClick={() => setPriceBand(i)}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
                  priceBand === i
                    ? "border-accent text-accent"
                    : "border-white/10 text-muted hover:text-ink"
                )}
              >
                {band.label}
              </button>
            ))}
            <button
              onClick={() => setNewOnly((v) => !v)}
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
                newOnly ? "border-accent text-accent" : "border-white/10 text-muted hover:text-ink"
              )}
            >
              New only
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted">{filtered.length} items</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-full border border-white/10 bg-surface px-3 py-1.5 font-body text-xs text-ink focus:outline-none"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product, i) => (
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
      )}
    </div>
  );
}