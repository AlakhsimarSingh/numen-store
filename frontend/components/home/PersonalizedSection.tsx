"use client";

import { motion } from "framer-motion";
import { Product } from "@/src/types";
import { useProfileStore } from "@/src/hooks/useProfileStore";
import { useWishlistStore } from "@/src/hooks/useWishlistStore";
import { useAuthStore } from "@/src/hooks/useAuthStore";
import ProductCard from "@/components/ProductCard";

const ease = [0.16, 1, 0.3, 1] as const;

export default function PersonalizedSection({ products }: { products: Product[] }) {
  const user = useAuthStore((s) => s.user);
  const favoriteCategories = useProfileStore((s) => s.favoriteCategories);
  const wishlistIds = useWishlistStore((s) => s.productIds);

  const byCategory = (slug: string) => products.filter((p) => p.categorySlug === slug);

  let list = products.filter((p) => p.isNew);
  let title = "Curated For You";
  let subtitle = "Fresh picks based on what's trending.";

  if (favoriteCategories.length > 0) {
    list = favoriteCategories.flatMap(byCategory);
    title = user?.name ? `Picked for ${user.name.split(" ")[0]}` : "Picked for You";
    subtitle = "Based on the categories you follow.";
  } else if (wishlistIds.length > 0) {
    const wishlisted = products.filter((p) => wishlistIds.includes(p.id));
    const categorySlugs = [...new Set(wishlisted.map((p) => p.categorySlug))];
    list = categorySlugs.flatMap(byCategory).filter((p) => !wishlistIds.includes(p.id));
    title = "More Like Your Wishlist";
    subtitle = "Similar to the pieces you've saved.";
  }

  const uniqueList = Array.from(new Map(list.map((p) => [p.id, p])).values()).slice(0, 8);

  if (uniqueList.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-8"
      >
        <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-accent">For You</span>
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h2>
        <p className="mt-2 font-body text-sm text-muted">{subtitle}</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {uniqueList.map((product, i) => (
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