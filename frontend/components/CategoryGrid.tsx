"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { fetchCategories, Category } from "@/src/lib/categories";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/src/types";

const ease = [0.16, 1, 0.3, 1] as const;

// Explicit, hand-picked browsing order: shoes first, then formal shoes,
// then watches, shades, ladies purse — everything else (slippers,
// perfumes, and anything added later) falls through to the end, sorted by
// productCount so new categories don't need a code change to appear
// sensibly. Matched against category.name (case-insensitive, partial
// match) rather than slug, since slugs weren't available here — swap to
// slug matching if you'd rather, it's more robust than name text.
const CATEGORY_ORDER = [
  "sneakers",
  "formal shoes",
  "watches",
  "shades",
  "purse",
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

  const sortedCategories = [...categories].sort((a, b) => {
    const rankDiff = orderRank(a) - orderRank(b);
    if (rankDiff !== 0) return rankDiff;
    return b.productCount - a.productCount;
  });

  // Only show a category section if it actually has products to display —
  // an empty "View all" section with no cards underneath reads as broken.
  const categorySections = sortedCategories
    .map((category) => ({
      category,
      categoryProducts: products.filter((p) => p.categorySlug === category.slug).slice(0, 4),
    }))
    .filter(({ categoryProducts }) => categoryProducts.length > 0);

  if (categorySections.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-10"
      >
        <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-accent">Browse</span>
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Categories</h2>
      </motion.div>

      <div className="space-y-14">
        {categorySections.map(({ category, categoryProducts }, sectionIndex) => (
          <motion.div
            key={category.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: (sectionIndex % 6) * 0.04, ease }}
          >
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-bold text-ink sm:text-2xl">{category.name}</h3>
                <p className="mt-1 font-mono text-xs text-muted">
                  {category.productCount} {category.productCount === 1 ? "item" : "items"}
                </p>
              </div>
              <Link
                href={`/shop/${category.slug}`}
                className="shrink-0 font-body text-xs font-semibold text-accent hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {categoryProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}