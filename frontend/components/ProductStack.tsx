"use client";

import { useEffect, useState } from "react";
import { motion, PanInfo } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "@/src/types";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { getDisplayPrice, formatMoney } from "@/src/lib/currency";

const ease = [0.16, 1, 0.3, 1] as const;
const SWIPE_THRESHOLD = 80;
const TRANSITION = { duration: 0.9, ease };
const MAX_VISIBLE_OFFSET = 2;

function circularOffset(index: number, current: number, total: number) {
  let diff = index - current;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

export default function ProductStack({
  products,
  onChangeIndex,
}: {
  products: Product[];
  onChangeIndex: (i: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const symbols = useCurrencyStore((s) => s.symbols);

  useEffect(() => {
    onChangeIndex(current);
  }, [current, onChangeIndex]);

  if (products.length === 0) return null;

  function advance(dir: 1 | -1) {
    setCurrent((prev) => (prev + dir + products.length) % products.length);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -SWIPE_THRESHOLD) advance(1);
    else if (info.offset.x > SWIPE_THRESHOLD) advance(-1);
  }

  return (
    <div className="relative flex h-[380px] items-center justify-center sm:h-[440px] md:h-[540px]">
      {products.map((product, i) => {
        const offset = circularOffset(i, current, products.length);
        const isActive = offset === 0;
        const hidden = Math.abs(offset) > MAX_VISIBLE_OFFSET;

        const rotate = offset * 11;
        const x = offset * 78;
        const y = Math.abs(offset) * 22;
        const scale = 1 - Math.abs(offset) * 0.09;
        const opacity = hidden ? 0 : 1 - Math.abs(offset) * 0.22;
        const zIndex = 10 - Math.abs(offset);

        const display = getDisplayPrice(product, currency, rates);
        const symbol = symbols[currency] ?? currency;
        const formattedPrice = formatMoney(display.price, currency, symbol);

        return (
          <motion.div
            key={product.id}
            className={
              isActive
                ? "absolute h-[80%] w-[62%] cursor-grab overflow-hidden rounded-3xl border border-white/10 shadow-2xl active:cursor-grabbing"
                : "absolute h-[80%] w-[62%] overflow-hidden rounded-3xl border border-white/5 shadow-2xl"
            }
            style={{ transformOrigin: "center 80%" }}
            animate={{ rotate, x, y, scale, opacity, zIndex }}
            transition={TRANSITION}
            drag={isActive ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={isActive ? handleDragEnd : undefined}
          >
            <Image
              src={product.image}
              alt={isActive ? product.name : ""}
              fill
              sizes="(max-width: 768px) 65vw, 30vw"
              className="object-cover"
              draggable={false}
              priority={isActive}
            />
            <div
              className="absolute inset-0 bg-bg transition-opacity duration-700"
              style={{ opacity: isActive ? 0 : 0.35 + Math.abs(offset) * 0.15 }}
            />

            {isActive && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5, ease }}
                className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-bg/95 via-bg/50 to-transparent p-5 pt-14"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                    Spotlight Drop
                  </p>
                  <p className="truncate font-body text-sm text-ink">{product.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted">
                    {display.estimated && <span className="text-muted/70">~</span>}
                    {formattedPrice}
                  </p>
                </div>
                <Link
                  href={`/product/${product.slug}`}
                  className="shrink-0 rounded-full bg-accent px-4 py-2 font-body text-xs font-semibold text-bg transition-transform hover:scale-105"
                >
                  Shop
                </Link>
              </motion.div>
            )}
          </motion.div>
        );
      })}

      <button
        onClick={() => advance(-1)}
        aria-label="Previous product"
        className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-bg/70 text-ink backdrop-blur-sm transition-colors hover:border-accent/50 hover:text-accent"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => advance(1)}
        aria-label="Next product"
        className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-bg/70 text-ink backdrop-blur-sm transition-colors hover:border-accent/50 hover:text-accent"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}