"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { fetchCategories, Category } from "@/src/lib/categories";
import { iconOptions, iconNames } from "@/src/lib/iconMap";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;
const CLOSE_DELAY = 150;

export default function CategoryMegaMenu() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {
        // Silently fail — the mega menu just won't show categories if this errors.
      });
  }, []);

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="group relative flex items-center gap-1 font-body text-sm text-muted transition-colors hover:text-ink"
      >
        Categories
        <ChevronDown
          size={14}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
        <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease }}
            className="absolute left-1/2 top-full z-40 mt-3 w-[560px] -translate-x-1/2 rounded-2xl border border-white/10 bg-surface p-5 shadow-2xl"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => {
                const Icon = iconOptions[cat.iconName] ?? iconOptions[iconNames[0]];
                return (
                  <Link
                    key={cat.slug}
                    href={`/shop/${cat.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface2"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink">
                      <Icon size={15} strokeWidth={1.75} />
                    </div>
                    <span className="truncate font-body text-sm text-ink/80">{cat.name}</span>
                  </Link>
                );
              })}
            </div>
            <Link
              href="/categories"
              onClick={() => setOpen(false)}
              className="mt-3 block rounded-xl border-t border-white/5 pt-3 text-center font-body text-xs text-accent hover:underline"
            >
              View all categories →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}