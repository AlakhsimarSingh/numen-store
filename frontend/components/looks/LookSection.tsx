"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, ShoppingBag, X } from "lucide-react";
import { Look, Product } from "@/src/types";
import { useCartStore } from "@/src/hooks/useCartStore";
import { useToastStore } from "@/src/hooks/useToastStore";
import { useProductPrice } from "@/src/hooks/useProductPrice";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

function HotspotPrice({ product }: { product: Product }) {
  const { formattedPrice } = useProductPrice(product);
  return <span className="font-mono text-sm text-ink">{formattedPrice}</span>;
}

function ProductPopover({
  product,
  selectedColor,
  selectedSize,
  onSelectColor,
  onSelectSize,
  onAdd,
  onClose,
}: {
  product: Product;
  selectedColor?: string;
  selectedSize?: string;
  onSelectColor: (c: string) => void;
  onSelectSize: (s: string) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  const stockForVariant = product.variantStock?.find(
    (v) => (v.color === selectedColor || !product.colors?.length) && (v.size === selectedSize || !product.sizes?.length)
  )?.stock;
  const outOfStock = stockForVariant === 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.2, ease }}
      className="w-64 overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl"
    >
      <div className="flex items-center gap-3 border-b border-white/5 p-3">
        <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-surface2">
          <Image src={product.image} alt={product.name} fill sizes="48px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-body text-sm text-ink">{product.name}</p>
          <HotspotPrice product={product} />
        </div>
        <button onClick={onClose} className="shrink-0 text-muted hover:text-ink">
          <X size={15} />
        </button>
      </div>

      <div className="space-y-2.5 p-3">
        {!!product.colors?.length && (
          <div className="flex flex-wrap gap-1.5">
            {product.colors.map((c) => (
              <button
                key={c.name}
                onClick={() => onSelectColor(c.name)}
                aria-label={c.name}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform",
                  selectedColor === c.name ? "border-accent scale-110" : "border-white/15"
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        )}
        {!!product.sizes?.length && (
          <div className="flex flex-wrap gap-1.5">
            {product.sizes.map((sz) => (
              <button
                key={sz}
                onClick={() => onSelectSize(sz)}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[11px]",
                  selectedSize === sz ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted"
                )}
              >
                {sz}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onAdd}
            disabled={outOfStock}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 font-body text-xs font-semibold transition-transform",
              outOfStock ? "cursor-not-allowed bg-surface2 text-muted" : "bg-accent text-bg hover:scale-[1.02]"
            )}
          >
            <Plus size={13} /> {outOfStock ? "Sold Out" : "Add"}
          </button>
          <Link
            href={`/product/${product.slug}`}
            className="flex items-center justify-center rounded-full border border-white/10 px-3 font-body text-xs text-muted hover:text-ink"
          >
            View
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function LookSection({ look }: { look: Look }) {
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useToastStore((s) => s.show);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, { color?: string; size?: string }>>({});

  const getSelection = (hotspotId: string, product: Product, defaultColor?: string, defaultSize?: string) => {
    const existing = selections[hotspotId];
    return {
      color: existing?.color ?? defaultColor ?? product.colors?.[0]?.name,
      size: existing?.size ?? defaultSize ?? product.sizes?.[0],
    };
  };

  function setSelection(hotspotId: string, updates: { color?: string; size?: string }) {
    setSelections((prev) => ({ ...prev, [hotspotId]: { ...prev[hotspotId], ...updates } }));
  }

  function addOne(hotspotId: string, product: Product, defaultColor?: string, defaultSize?: string) {
    const { color, size } = getSelection(hotspotId, product, defaultColor, defaultSize);
    addItem(product, 1, { color, size });
    showToast(`${product.name} added to cart`);
  }

  function shopFullLook() {
    let addedCount = 0;
    let skipped = 0;
    for (const h of look.hotspots) {
      const { color, size } = getSelection(h.id, h.product, h.defaultColor, h.defaultSize);
      const stock = h.product.variantStock?.find(
        (v) => (v.color === color || !h.product.colors?.length) && (v.size === size || !h.product.sizes?.length)
      )?.stock;
      if (stock === 0) {
        skipped += 1;
        continue;
      }
      addItem(h.product, 1, { color, size });
      addedCount += 1;
    }
    if (addedCount > 0) {
      showToast(`${addedCount} item${addedCount !== 1 ? "s" : ""} added to cart${skipped > 0 ? ` (${skipped} sold out, skipped)` : ""}`);
    } else {
      showToast("Everything in this look is currently sold out", "error");
    }
  }

  const thumbnails = useMemo(() => look.hotspots.map((h) => h.product), [look.hotspots]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease }}
      className="mx-auto max-w-6xl px-6 py-14"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-surface2 sm:aspect-[3/4]">
          <Image src={look.image} alt={look.title} fill sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />

          {look.hotspots.map((h) => (
            <div
              key={h.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${h.xPercent}%`, top: `${h.yPercent}%` }}
            >
              <button
                onClick={() => setActiveHotspot(activeHotspot === h.id ? null : h.id)}
                aria-label={`View ${h.product.name}`}
                className="relative flex h-8 w-8 items-center justify-center"
              >
                <motion.span
                  className="absolute inset-0 rounded-full bg-accent/50"
                  animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
                <span className="relative flex h-4 w-4 items-center justify-center rounded-full border-2 border-bg bg-accent shadow-lg">
                  <Plus size={10} className="text-bg" />
                </span>
              </button>

              <AnimatePresence>
                {activeHotspot === h.id && (
                  <div
                    className={cn(
                      "absolute top-10 z-10",
                      h.xPercent > 60 ? "right-0" : "left-0"
                    )}
                  >
                    <ProductPopover
                      product={h.product}
                      selectedColor={getSelection(h.id, h.product, h.defaultColor, h.defaultSize).color}
                      selectedSize={getSelection(h.id, h.product, h.defaultColor, h.defaultSize).size}
                      onSelectColor={(c) => setSelection(h.id, { color: c })}
                      onSelectSize={(s) => setSelection(h.id, { size: s })}
                      onAdd={() => addOne(h.id, h.product, h.defaultColor, h.defaultSize)}
                      onClose={() => setActiveHotspot(null)}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Shop The Look</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{look.title}</h2>
          {look.subtitle && <p className="mt-3 max-w-md font-body text-sm text-muted">{look.subtitle}</p>}

          <button
            onClick={shopFullLook}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] sm:w-auto sm:px-8"
          >
            <ShoppingBag size={16} /> Add Full Look to Cart
          </button>

          <div className="mt-8">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">Featured in this look</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {thumbnails.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setActiveHotspot(look.hotspots[i].id)}
                  className={cn(
                    "relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                    activeHotspot === look.hotspots[i].id ? "border-accent" : "border-transparent"
                  )}
                >
                  <Image src={p.image} alt={p.name} fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}