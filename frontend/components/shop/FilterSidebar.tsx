"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Category } from "@/src/lib/categories";
import { cn } from "@/src/lib/utils";

export interface PriceBand {
  label: string;
  min: number;
  max: number | null;
}

export interface FilterState {
  activeCategory: string;
  activeColors: string[];
  activeSizes: string[];
  priceBand: number;
  newOnly: boolean;
}

export interface FilterSidebarProps {
  categories?: Category[];
  showCategoryFilter?: boolean;
  activeCategory: string;
  onCategoryChange: (slug: string) => void;

  availableColors: { name: string; hex: string }[];
  activeColors: string[];
  onToggleColor: (name: string) => void;

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
    props.activeColors.length +
    props.activeSizes.length +
    (props.priceBand !== 0 ? 1 : 0) +
    (props.newOnly ? 1 : 0)
  );
}

function FilterContent(props: FilterSidebarProps) {
  const {
    categories = [],
    showCategoryFilter,
    activeCategory,
    onCategoryChange,
    availableColors,
    activeColors,
    onToggleColor,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Filters</p>
        {count > 0 && (
          <button type="button" onClick={onReset} className="font-body text-xs text-accent hover:underline">
            Reset all
          </button>
        )}
      </div>

      {showCategoryFilter && categories.length > 0 && (
        <div>
          <p className="mb-2 font-body text-xs text-muted">Category</p>
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

      {availableColors.length > 0 && (
        <div>
          <p className="mb-2 font-body text-xs text-muted">Color</p>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => onToggleColor(c.name)}
                aria-label={c.name}
                title={c.name}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-transform",
                  activeColors.includes(c.name) ? "border-accent scale-110" : "border-white/15"
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
      )}

      {availableSizes.length > 0 && (
        <div>
          <p className="mb-2 font-body text-xs text-muted">Size</p>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => onToggleSize(sz)}
                className={cn(
                  "rounded-full border px-3 py-1 font-body text-xs transition-colors",
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

      <div>
        <p className="mb-2 font-body text-xs text-muted">Price</p>
        <div className="flex flex-col gap-1.5">
          {priceBands.map((band, i) => (
            <button
              key={band.label}
              type="button"
              onClick={() => onPriceBandChange(i)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-left font-mono text-xs transition-colors",
                priceBand === i ? "border-accent text-accent" : "border-white/10 text-muted hover:text-ink"
              )}
            >
              {band.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={onToggleNewOnly}
          className={cn(
            "w-full rounded-lg border px-3 py-1.5 text-left font-mono text-xs transition-colors",
            newOnly ? "border-accent text-accent" : "border-white/10 text-muted hover:text-ink"
          )}
        >
          New drops only
        </button>
      </div>
    </div>
  );
}

// Static right-hand sidebar — desktop only. Sticky so it stays in view
// while the results column scrolls.
export function DesktopFilterAside(props: FilterSidebarProps) {
  return (
    <aside className="hidden shrink-0 lg:block lg:w-[260px]">
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
          "flex items-center gap-2 rounded-full border px-4 py-2 font-body text-xs transition-colors",
          count > 0 ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-ink"
        )}
      >
        <SlidersHorizontal size={14} /> Filters {count > 0 && `(${count})`}
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] flex items-end bg-bg/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">Filters</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <FilterContent {...props} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg"
            >
              Show {props.resultCount} result{props.resultCount !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}