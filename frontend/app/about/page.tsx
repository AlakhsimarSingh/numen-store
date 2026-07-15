"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Leaf, Sparkles, Truck, Users } from "lucide-react";
import { categories } from "@/src/data/categories";

const ease = [0.16, 1, 0.3, 1] as const;

const values = [
  {
    icon: Sparkles,
    title: "Premium, not pretentious",
    desc: "Quality fits and finishes without the markup that comes with a logo alone.",
  },
  {
    icon: Truck,
    title: "Fast, honest shipping",
    desc: "Real delivery windows, no surprise fees buried at checkout.",
  },
  {
    icon: Leaf,
    title: "Made to last",
    desc: "We'd rather sell you fewer things that hold up than more that don't.",
  },
  {
    icon: Users,
    title: "Built with our community",
    desc: "Drops are shaped by what our customers actually ask for.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <section className="border-b border-white/5 bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="font-mono text-xs uppercase tracking-widest text-accent"
          >
            Our story
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease }}
            className="mt-4 font-display text-4xl font-bold text-ink sm:text-5xl"
          >
            Wear the drop, not the markup.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease }}
            className="mx-auto mt-5 max-w-xl font-body text-muted"
          >
            NUMEN started as a simple frustration: premium fits shouldn&apos;t require premium patience or a premium
            bank account. Today we run {categories.length} categories of everyday and statement pieces, dropped
            weekly, priced honestly.
          </motion.p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => {
            const Icon = v.icon;
            return (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.08, ease }}
                className="rounded-2xl border border-white/5 bg-surface p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 font-body text-sm font-semibold text-ink">{v.title}</h3>
                <p className="mt-2 font-body text-xs leading-relaxed text-muted">{v.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/5 bg-surface">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">Ready to find your fit?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/shop"
              className="rounded-full bg-accent px-7 py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-105"
            >
              Shop New Arrivals
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-white/15 px-7 py-3 font-body text-sm font-semibold text-ink transition-colors hover:border-accent/50 hover:text-accent"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}