"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { FlashDeal } from "@/src/lib/flashDeal";
import { useProductPrice } from "@/src/hooks/useProductPrice";
import { formatCountdown } from "@/src/lib/countdown";

const ease = [0.16, 1, 0.3, 1] as const;

export default function FlashDealSection({ deal }: { deal: FlashDeal }) {
  const endTime = new Date(deal.endsAt).getTime();
  const [remaining, setRemaining] = useState(() => endTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(endTime - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const { product } = deal;
  const { price, compareAtPrice, formattedPrice, formattedCompareAt, estimated } = useProductPrice(product);

  if (remaining <= 0) return null;

  const { hours, minutes, seconds } = formatCountdown(remaining);
  const discountPercent = compareAtPrice
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease }}
        className="relative overflow-hidden rounded-3xl border border-accent2/20 bg-gradient-to-br from-surface via-surface to-accent2/5"
      >
        <div className="flex flex-col items-center gap-6 p-6 text-center sm:p-10 md:flex-row md:items-center md:gap-8 md:text-left">
          <div className="relative h-48 w-40 shrink-0 overflow-hidden rounded-2xl sm:h-52">
            <Image src={product.image} alt={product.name} fill sizes="200px" className="object-cover" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest text-accent2 md:justify-start">
              <Zap size={13} fill="currentColor" /> {deal.label}
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">{product.name}</h2>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <span className="font-mono text-xl text-ink">
                {estimated && <span className="text-muted">~</span>}
                {formattedPrice}
              </span>
              {formattedCompareAt && (
                <>
                  <span className="font-mono text-sm text-muted line-through">{formattedCompareAt}</span>
                  {discountPercent > 0 && (
                    <span className="rounded-full bg-accent2/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-accent2">
                      -{discountPercent}%
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 md:justify-start">
              {[
                { label: "HRS", value: hours },
                { label: "MIN", value: minutes },
                { label: "SEC", value: seconds },
              ].map((unit) => (
                <div key={unit.label} className="flex flex-col items-center rounded-xl bg-bg px-3.5 py-2">
                  <span className="font-mono text-lg text-ink tabular-nums">{unit.value}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted">{unit.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href={`/product/${product.slug}`}
            className="w-full shrink-0 rounded-full bg-accent px-7 py-3.5 text-center font-body text-sm font-semibold text-bg transition-transform hover:scale-105 md:w-auto"
          >
            Grab the Deal
          </Link>
        </div>
      </motion.div>
    </section>
  );
}