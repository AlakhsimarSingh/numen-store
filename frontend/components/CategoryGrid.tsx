"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { fetchCategories, Category } from "@/src/lib/categories";
import CategoryMosaicCard from "@/components/CategoryMosaicCard";
import type { Product } from "@/src/types";

const ease = [0.16, 1, 0.3, 1] as const;

// Explicit, hand-picked browsing order: footwear first (sneakers → formal →
// slippers, roughly "most worn" to "least"), then accessories you wear
// (watches → shades → bags), then fragrance last. Matched against
// category.name (case-insensitive, partial match) rather than slug, since
// slugs weren't available here — swap to slug matching if you'd rather,
// it's more robust than name text.
const CATEGORY_ORDER = [
  "sneakers",
  "formal shoes",
  "slippers",
  "watches",
  "shades",
  "purse",
  "perfumes",
];

function orderRank(category: Category): number {
  const name = category.name.toLowerCase();
  const idx = CATEGORY_ORDER.findIndex((key) => name.includes(key));
  return idx === -1 ? CATEGORY_ORDER.length : idx;
}

interface CategoryGridProps {
  products: Product[];
}

export default function CategoryGrid({ products }: CategoryGridProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  // Primary sort: hand-picked order above. Any category that doesn't match
  // one of those keys (e.g. a new one added later) falls through to the
  // end, sorted by productCount so it doesn't need a code change to appear
  // sensibly — but it also won't silently slot into the "wrong" spot.
  const sortedCategories = [...categories].sort((a, b) => {
    const rankDiff = orderRank(a) - orderRank(b);
    if (rankDiff !== 0) return rankDiff;
    return b.productCount - a.productCount;
  });

  if (sortedCategories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-8"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-accent">Browse</span>
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Categories</h2>
          </div>
          <Link href="/categories" className="shrink-0 font-body text-xs font-semibold text-accent hover:underline">View all</Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {sortedCategories.map((category, i) => {
          const categoryProducts = products
            .filter((p) => p.categorySlug === category.slug)
            .slice(0, 4);

          return (
            <motion.div
              key={category.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (i % 12) * 0.04, ease }}
            >
              <CategoryMosaicCard category={category} products={categoryProducts} />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}