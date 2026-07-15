"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { FlashDeal } from "@/src/lib/flashDeal";
import { formatPrice } from "@/src/lib/utils";
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

  if (remaining <= 0) return null;

  const { product } = deal;
  const { hours, minutes, seconds } = formatCountdown(remaining);
  const discountPercent = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
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
        <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-10 md:grid-cols-[auto_1fr_auto]">
          <div className="relative h-40 w-32 shrink-0 overflow-hidden rounded-2xl sm:h-52 sm:w-40">
            <Image src={product.image} alt={product.name} fill sizes="200px" className="object-cover" />
          </div>

          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent2">
              <Zap size={13} fill="currentColor" /> {deal.label}
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">{product.name}</h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-mono text-xl text-ink">{formatPrice(product.price)}</span>
              {product.compareAtPrice && (
                <>
                  <span className="font-mono text-sm text-muted line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                  <span className="rounded-full bg-accent2/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-accent2">
                    -{discountPercent}%
                  </span>
                </>
              )}
            </div>

            <div className="mt-5 flex items-center gap-2">
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
            className="shrink-0 rounded-full bg-accent px-7 py-3.5 text-center font-body text-sm font-semibold text-bg transition-transform hover:scale-105"
          >
            Grab the Deal
          </Link>
        </div>
      </motion.div>
    </section>
  );
}