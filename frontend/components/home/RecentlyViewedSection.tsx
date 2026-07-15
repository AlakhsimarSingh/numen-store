"use client";

import { motion } from "framer-motion";
import { History } from "lucide-react";
import { Product } from "@/src/types";
import { useRecentlyViewedStore } from "@/src/hooks/useRecentlyViewedStore";
import ProductCard from "@/components/ProductCard";

const ease = [0.16, 1, 0.3, 1] as const;

export default function RecentlyViewedSection({ products }: { products: Product[] }) {
  const productIds = useRecentlyViewedStore((s) => s.productIds);
  const items = productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 4);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-8 flex items-center gap-2"
      >
        <History size={16} className="text-accent" />
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">Recently Viewed</h2>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08, ease }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}