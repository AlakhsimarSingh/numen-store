"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { fetchCategories, Category } from "@/src/lib/categories";
import CategoryCard from "@/components/CategoryCard";

const ease = [0.16, 1, 0.3, 1] as const;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={28} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mb-10"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Browse</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">All Categories</h1>
        <p className="mt-2 max-w-xl font-body text-sm text-muted">
          {categories.length} categories, every fit covered — from everyday staples to statement pieces.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((category, i) => {
          return (
            <motion.div
              key={category.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (i % 9) * 0.04, ease }}
            >
              <CategoryCard category={category} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}