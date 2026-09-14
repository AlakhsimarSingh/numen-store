"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { fetchCategories, Category } from "@/src/lib/categories";
import CategoryCard from "@/components/CategoryCard";

const ease = [0.16, 1, 0.3, 1] as const;

export default function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const featuredCategories = [...categories].sort((a, b) => b.productCount - a.productCount).slice(0, 4);

  if (featuredCategories.length === 0) return null;

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
        {featuredCategories.map((category, i) => {
          return (
            <motion.div
              key={category.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (i % 12) * 0.04, ease }}
            >
              <CategoryCard category={category} />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}