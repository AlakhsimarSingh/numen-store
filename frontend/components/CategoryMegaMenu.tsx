"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { fetchCategories, Category } from "@/src/lib/categories";
import { iconOptions, iconNames } from "@/src/lib/iconMap";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;
const CLOSE_DELAY = 150;

export default function CategoryMegaMenu() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {
        // Silently fail — the mega menu just won't show categories if this errors.
      });
  }, []);

  // Default the spotlight to the first category the moment the panel
  // opens (and categories have loaded), rather than showing nothing
  // until the customer happens to hover a row.
  useEffect(() => {
    if (open && !activeSlug && categories.length > 0) {
      setActiveSlug(categories[0].slug);
    }
  }, [open, activeSlug, categories]);

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  const activeCategory = categories.find((c) => c.slug === activeSlug) ?? categories[0];

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
            className="absolute left-1/2 top-full z-40 mt-3 w-[720px] -translate-x-1/2 overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-2xl"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="grid grid-cols-[260px_1fr]">
              {/* Category list — capped to the same height as the image pane and
                  independently scrollable, so a long category list grows a scrollbar
                  here instead of pushing the whole panel taller than the viewport. */}
              <div className="max-h-[360px] overflow-y-auto border-r border-white/5 p-3">
                {categories.map((cat) => {
                  const Icon = iconOptions[cat.iconName] ?? iconOptions[iconNames[0]];
                  const isActive = cat.slug === activeCategory?.slug;
                  return (
                    <Link
                      key={cat.slug}
                      href={`/shop/${cat.slug}`}
                      onMouseEnter={() => setActiveSlug(cat.slug)}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "group/item flex items-center justify-between gap-2 rounded-2xl px-4 py-3 transition-colors",
                        isActive ? "bg-surface2" : "hover:bg-surface2/60"
                      )}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
                            isActive ? "bg-accent text-bg" : "bg-surface2 text-muted"
                          )}
                        >
                          <Icon size={13} strokeWidth={1.75} />
                        </span>
                        <span className={cn("truncate font-body text-sm", isActive ? "text-ink" : "text-ink/70")}>
                          {cat.name}
                        </span>
                      </span>
                      <ArrowRight
                        size={13}
                        className={cn(
                          "shrink-0 text-muted transition-all duration-200",
                          isActive ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                        )}
                      />
                    </Link>
                  );
                })}
                {categories.length === 0 && (
                  <p className="px-4 py-6 font-body text-xs text-muted">No categories yet.</p>
                )}
                <Link
                  href="/categories"
                  onClick={() => setOpen(false)}
                  className="mt-1 block rounded-2xl px-4 py-3 font-body text-xs text-accent hover:underline"
                >
                  View all categories →
                </Link>
              </div>

              {/* Spotlight image pane — crossfades to the hovered category's
                  representative product image. Falls back to a plain icon
                  tile when a category has no products (and therefore no
                  previewImage) yet. */}
              <div className="relative h-[360px] bg-bg">
                <AnimatePresence mode="wait">
                  {activeCategory && (
                    <motion.div
                      key={activeCategory.slug}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease }}
                      className="absolute inset-0"
                    >
                      {activeCategory.previewImage ? (
                        <Image
                          src={activeCategory.previewImage}
                          alt={activeCategory.name}
                          fill
                          sizes="460px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface2">
                          {(() => {
                            const Icon = iconOptions[activeCategory.iconName] ?? iconOptions[iconNames[0]];
                            return <Icon size={48} strokeWidth={1} className="text-muted" />;
                          })()}
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/90 via-bg/20 to-transparent p-5">
                        <p className="font-display text-xl font-bold text-ink">{activeCategory.name}</p>
                        <p className="font-mono text-xs text-muted">
                          {activeCategory.productCount} item{activeCategory.productCount !== 1 ? "s" : ""}
                        </p>
                        <Link
                          href={`/shop/${activeCategory.slug}`}
                          onClick={() => setOpen(false)}
                          className="mt-2 inline-flex items-center gap-1.5 font-body text-xs font-semibold text-accent hover:underline"
                        >
                          Shop {activeCategory.name} <ArrowRight size={12} />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}