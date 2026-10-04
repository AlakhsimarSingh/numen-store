"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import { useInterestStore } from "@/src/hooks/useInterestStore";
import type { CategorySection } from "@/src/lib/home";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Categories are now fetched, sorted and filtered on the server and arrive as
 * props, so this section is part of the initial HTML. Before, it fetched
 * /categories in a useEffect after hydration and popped in late (shifting the
 * whole page while the user was already scrolling).
 */
export default function CategoryGrid({ sections }: { sections: CategorySection[] }) {
  if (sections.length === 0) return null;

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
        {sections.map(({ category, products }, sectionIndex) => (
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
                onClick={() => useInterestStore.getState().track(category.slug, "category")}
                className="shrink-0 font-body text-xs font-semibold text-accent hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}