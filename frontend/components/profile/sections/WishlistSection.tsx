"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import { fetchWishlist } from "@/src/lib/wishlist";
import { Product } from "@/src/types";
import ProductCard from "@/components/ProductCard";

const ease = [0.16, 1, 0.3, 1] as const;

export default function WishlistSection() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist()
      .then((data) => setItems(data.products))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-surface p-10 text-center">
        <Heart size={24} className="mx-auto text-muted" />
        <p className="mt-3 font-body text-sm text-muted">Nothing saved yet — tap the heart on any product.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className="grid grid-cols-2 gap-4 sm:grid-cols-3"
    >
      {items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </motion.div>
  );
}