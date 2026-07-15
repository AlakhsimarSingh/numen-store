"use client";

import { motion } from "framer-motion";
import { Product } from "@/src/types";
import ProductCard from "./ProductCard";

const ease = [0.16, 1, 0.3, 1] as const;

export default function FeaturedProducts({ products }: { products: Product[] }) {
  const featured = products.filter((p) => p.isNew).slice(0, 8);
  const fallback = products.slice(0, 8);
  const list = featured.length >= 4 ? featured : fallback;

  if (list.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-8 flex items-end justify-between"
      >
        <div>
          <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-accent">
            Fresh Stock
          </span>
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Featured Drops</h2>
        </div>
        <a href="/shop" className="hidden font-body text-sm text-muted hover:text-accent sm:block">
          View all →
        </a>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 4) * 0.08, ease }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}