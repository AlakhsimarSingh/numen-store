"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Product } from "@/src/types";
import { useReviewsStore } from "@/src/hooks/useReviewsStore";
import { computeRatingSummary } from "@/src/lib/reviews";
import ProductCard from "@/components/ProductCard";

const ease = [0.16, 1, 0.3, 1] as const;

export default function BestSellersSection({ products }: { products: Product[] }) {
  const reviews = useReviewsStore((s) => s.reviews);

  const ranked = [...products]
    .map((p) => {
      const productReviews = reviews.filter((r) => r.productId === p.id);
      // reviews from the store have a different Review type (extra fields).
      // Cast to any to satisfy computeRatingSummary's expected Review[] shape.
      const summary = computeRatingSummary(p.rating, 12, productReviews as any);
      return { product: p, average: summary.average, count: summary.totalCount };
    })
    .filter((entry) => entry.product.stock > 0)
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, 8)
    .map((entry) => entry.product);

  if (ranked.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-8 flex items-center gap-2"
      >
        <TrendingUp size={16} className="text-accent" />
        <div>
          <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-accent">Trending Now</span>
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Best Sellers</h2>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {ranked.map((product, i) => (
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