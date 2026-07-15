"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { categories } from "@/src/data/categories";

const ease = [0.16, 1, 0.3, 1] as const;

export default function CategoryGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-8"
      >
        <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-accent">
          Browse
        </span>
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Shop by Category</h2>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (i % 12) * 0.04, ease }}
            >
              <Link
                href={`/shop/${cat.slug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-surface px-4 py-6 text-center transition-colors hover:border-accent/40 hover:bg-surface2"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface2 text-ink transition-colors group-hover:bg-accent group-hover:text-bg">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <span className="font-body text-xs text-muted transition-colors group-hover:text-ink">
                  {cat.name}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}