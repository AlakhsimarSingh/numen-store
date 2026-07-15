"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { fetchCategories, Category } from "@/src/lib/categories";
import { iconOptions, iconNames } from "@/src/lib/iconMap";

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, i) => {
          const Icon = iconOptions[cat.iconName] ?? iconOptions[iconNames[0]];
          return (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (i % 9) * 0.04, ease }}
            >
              <Link
                href={`/shop/${cat.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-surface p-5 transition-colors hover:border-accent/40 hover:bg-surface2"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink transition-colors group-hover:bg-accent group-hover:text-bg">
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm font-medium text-ink">{cat.name}</p>
                  <p className="font-mono text-xs text-muted">{cat.productCount} items</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}