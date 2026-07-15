"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchCategories, Category } from "@/src/lib/categories";
import { iconOptions, iconNames } from "@/src/lib/iconMap";

export default function CategoryTicker() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {
        // Silently fail — the ticker just won't render if this errors.
      });
  }, []);

  if (categories.length === 0) return null;

  const loop = [...categories, ...categories];

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden border-y border-white/5 bg-surface py-3"
    >
      <div className="flex w-max animate-marquee gap-8">
        {loop.map((cat, i) => {
          const Icon = iconOptions[cat.iconName] ?? iconOptions[iconNames[0]];
          return (
            <Link
              key={`${cat.slug}-${i}`}
              href={`/shop/${cat.slug}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-sm text-muted transition-colors hover:border-accent/50 hover:text-ink"
            >
              <Icon size={14} strokeWidth={1.75} className="text-accent" />
              <span className="font-body">{cat.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface to-transparent" />
    </motion.div>
  );
}