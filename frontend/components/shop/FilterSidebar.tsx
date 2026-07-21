"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Ruler, SlidersHorizontal, Sparkles, Tag, Wallet, X } from "lucide-react";
import { Category } from "@/src/lib/categories";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

export interface PriceBand {
  label: string;
  min: number;
  max: number | null;
}

export interface FilterSidebarProps {
  categories?: Category[];
  showCategoryFilter?: boolean;
  activeCategory: string;
  onCategoryChange: (slug: string) => void;

  availableSizes: string[];
  activeSizes: string[];
  onToggleSize: (size: string) => void;

  priceBands: PriceBand[];
  priceBand: number;
  onPriceBandChange: (i: number) => void;

  newOnly: boolean;
  onToggleNewOnly: () => void;

  onReset: () => void;
  resultCount: number;
}

function activeFilterCount(props: FilterSidebarProps) {
  return (
    (props.showCategoryFilter && props.activeCategory !== "all" ? 1 : 0) +
    props.activeSizes.length +
    (props.priceBand !== 0 ? 1 : 0) +
    (props.newOnly ? 1 : 0)
  );
}

function SectionLabel({ icon: Icon, children }: { icon: typeof Tag; children: React.ReactNode }) {
  return (
    <p className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted">
      <Icon size={12} /> {children}
    </p>
  );
}

function FilterContent(props: FilterSidebarProps) {
  const {
    categories = [],
    showCategoryFilter,
    activeCategory,
    onCategoryChange,
    availableSizes,
    activeSizes,
    onToggleSize,
    priceBands,
    priceBand,
    onPriceBandChange,
    newOnly,
    onToggleNewOnly,
    onReset,
  } = props;

  const count = activeFilterCount(props);

  return (
    <div className="divide-y divide-white/5">
      <div className="flex items-center justify-between pb-4">
        <p className="font-display text-sm font-bold text-ink">Filters</p>
        {count > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 font-body text-xs text-accent hover:underline"
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      {showCategoryFilter && categories.length > 0 && (
        <div className="py-5">
          <SectionLabel icon={Tag}>Category</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCategoryChange("all")}
              className={cn(
                "rounded-full border px-3.5 py-1.5 font-body text-xs transition-colors",
                activeCategory === "all" ? "border-accent bg-accent text-bg" : "border-white/10 text-muted hover:text-ink"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => onCategoryChange(cat.slug)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 font-body text-xs transition-colors",
                  activeCategory === cat.slug
                    ? "border-accent bg-accent text-bg"
                    : "border-white/10 text-muted hover:text-ink"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {availableSizes.length > 0 && (
        <div className="py-5">
          <SectionLabel icon={Ruler}>Size</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => onToggleSize(sz)}
                className={cn(
                  "rounded-full border px-3.5 py-2 font-body text-xs transition-colors",
                  activeSizes.includes(sz)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-white/10 text-muted hover:text-ink"
                )}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="py-5">
        <SectionLabel icon={Wallet}>Price</SectionLabel>
        <div className="space-y-1.5">
          {priceBands.map((band, i) => (
            <button
              key={band.label}
              type="button"
              onClick={() => onPriceBandChange(i)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                priceBand === i ? "border-accent bg-accent/5" : "border-white/10 hover:border-white/20"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  priceBand === i ? "border-accent" : "border-white/20"
                )}
              >
                {priceBand === i && <span className="h-2 w-2 rounded-full bg-accent" />}
              </span>
              <span className="font-mono text-xs text-ink">{band.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5">
        <button
          type="button"
          onClick={onToggleNewOnly}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border px-3.5 py-3 transition-colors",
            newOnly ? "border-accent/40 bg-accent/5" : "border-white/10 hover:border-white/20"
          )}
        >
          <span className="flex items-center gap-2 font-body text-sm text-ink">
            <Sparkles size={15} className="text-accent" /> New drops only
          </span>
          <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", newOnly ? "bg-accent" : "bg-white/10")}>
            <motion.span
              className="absolute top-0.5 h-4 w-4 rounded-full bg-bg"
              animate={{ left: newOnly ? 18 : 2 }}
              transition={{ duration: 0.2, ease }}
            />
          </span>
        </button>
      </div>
    </div>
  );
}

// Static right-hand sidebar — desktop only. Sticky so it stays in view
// while the results column scrolls.
export function DesktopFilterAside(props: FilterSidebarProps) {
  return (
    <aside className="hidden shrink-0 lg:block lg:w-[272px]">
      <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto rounded-2xl border border-white/5 bg-surface p-5">
        <FilterContent {...props} />
      </div>
    </aside>
  );
}

// Self-contained trigger + slide-up drawer for mobile. Fully independent
// of DesktopFilterAside so callers just drop both in — one renders on
// mobile, the other on desktop, driven by the same filter state/props.
export function MobileFilterButton(props: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(props);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center gap-2 rounded-full border px-4 py-2 font-body text-xs transition-colors",
          count > 0 ? "border-accent text-accent" : "border-white/10 text-ink hover:border-white/20"
        )}
      >
        <SlidersHorizontal size={14} /> Filters
        {count > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-bg">
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[95] flex items-end bg-bg/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface px-6 pb-6 pt-3"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-ink">Filters</h3>
                <button onClick={() => setOpen(false)} className="text-muted hover:text-ink">
                  <X size={18} />
                </button>
              </div>
              <FilterContent {...props} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-6 w-full rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01]"
              >
                Show {props.resultCount} result{props.resultCount !== 1 ? "s" : ""}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}