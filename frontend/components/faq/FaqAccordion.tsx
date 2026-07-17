"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { FaqCategory } from "@/src/data/faqContent";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

export default function FaqAccordion({ categories }: { categories: FaqCategory[] }) {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;

    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, query]);

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-surface px-4 py-3">
        <Search size={16} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search FAQs — e.g. 'return policy', 'COD', 'tracking'…"
          className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </div>

      <div className="mt-8 space-y-10">
        {filtered.map((category) => (
          <div key={category.key}>
            <h2 className="font-display text-lg font-bold text-ink">{category.title}</h2>
            <div className="mt-3 space-y-2.5">
              {category.items.map((item, i) => {
                const itemKey = `${category.key}-${i}`;
                const isOpen = openKey === itemKey;
                return (
                  <div key={itemKey} className="overflow-hidden rounded-2xl border border-white/5 bg-surface">
                    <button
                      onClick={() => setOpenKey(isOpen ? null : itemKey)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="font-body text-sm text-ink">{item.question}</span>
                      <ChevronDown
                        size={16}
                        className={cn("shrink-0 text-muted transition-transform duration-200", isOpen && "rotate-180 text-accent")}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease }}
                          className="overflow-hidden"
                        >
                          <p className="px-5 pb-4 font-body text-sm leading-relaxed text-muted">{item.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-white/5 bg-surface px-5 py-10 text-center font-body text-sm text-muted">
            No results for &ldquo;{query}&rdquo;. Try a different term, or{" "}
            <a href="/contact" className="text-accent hover:underline">ask us directly</a>.
          </p>
        )}
      </div>
    </div>
  );
}