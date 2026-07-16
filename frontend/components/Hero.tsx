"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { Product } from "@/src/types";
import ProductStack from "./ProductStack";

const ease = [0.16, 1, 0.3, 1] as const;

interface HeroProps {
  heroHeadlineLines: string[];
  heroSubtext: string;
  heroImage: string;
  products: Product[];
}

/**
 * Fluid, per-line headline sizing. Shorter lines (e.g. "WEAR") get a bigger
 * clamp range than longer ones, so a short admin-entered word reads with
 * real visual weight instead of looking small relative to the space it has.
 * clamp(min, preferred-vw, max) scales continuously across every viewport
 * width rather than jumping at fixed breakpoints.
 */
function getHeadlineLineStyle(line: string): CSSProperties {
  const len = line.trim().length;
  if (len <= 4) return { fontSize: "clamp(4.5rem, 5vw + 3.5rem, 10rem)" };
  if (len <= 7) return { fontSize: "clamp(3.75rem, 4.5vw + 3rem, 8.75rem)" };
  if (len <= 11) return { fontSize: "clamp(3.25rem, 4vw + 2.25rem, 7.5rem)" };
  return { fontSize: "clamp(2.75rem, 3.5vw + 1.75rem, 6.25rem)" };
}

export default function Hero({ heroHeadlineLines, heroSubtext, heroImage, products }: HeroProps) {
  const [, setActiveIndex] = useState(0);

  // Spotlight Drop is fully admin-controlled: only products explicitly
  // flagged `isSpotlight` in the admin panel show up here. `products` is
  // already ordered newest-first (see fetchProductsServer), so if nothing
  // has been flagged yet we fall back to the 5 newest products rather than
  // showing an empty hero.
  const spotlighted = products.filter((p) => p.isSpotlight);
  const spotlightList = (spotlighted.length > 0 ? spotlighted : products).slice(0, 5);
  const spotlightCount = spotlightList.length;
  const spotlightLabel = `Spotlight Drop — 01 / ${String(spotlightCount).padStart(2, "0")}`;

  return (
    <section className="relative -mt-20 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.2, ease }}
          className="absolute inset-0"
        >
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ filter: "saturate(0.75) contrast(1.08) brightness(0.55)" }}
          />
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-bg/20 md:via-bg/50 md:to-transparent" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(11,11,12,0.55) 100%)" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay" aria-hidden="true">
          <filter id="hero-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hero-grain)" />
        </svg>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-start gap-9 px-6 pb-14 pt-28 sm:gap-11 md:grid md:grid-cols-2 md:items-center md:gap-10 md:pb-28 md:pt-36">
        <div className="relative flex w-full flex-col items-start text-left">
          {/* Mobile-only vertical spine label — asymmetric counterweight to the
              left-aligned text block on narrow viewports. Hidden from md up,
              where the corner tag on ProductStack takes over instead. */}
          {spotlightCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.6, ease }}
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-6 max-[420px]:flex items-center justify-center sm:flex md:hidden"
            >
              <span
                className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-muted/50"
                style={{ writingMode: "vertical-rl" }}
              >
                {spotlightLabel}
              </span>
            </motion.div>
          )}

          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease }}
            className="mb-4 inline-block rounded-full border border-accent/30 px-3 py-1 font-mono text-xs uppercase tracking-widest text-accent"
          >
            New Season Drop
          </motion.span>

          <h1 className="font-display font-bold leading-[0.95] tracking-tight text-ink">
            {heroHeadlineLines.map((line, i) => (
              <span key={`${line}-${i}`} className="block overflow-hidden" style={getHeadlineLineStyle(line)}>
                <motion.span
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.35 + i * 0.12, duration: 0.7, ease }}
                  className="block"
                >
                  {i === heroHeadlineLines.length - 1 ? <span className="text-accent">{line}</span> : line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5, ease }}
            className="mt-5 max-w-md pr-8 font-body text-sm text-muted sm:mt-6 sm:pr-0 sm:text-base"
          >
            {heroSubtext}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.92, duration: 0.5, ease }}
            className="mt-7 flex flex-wrap items-center gap-3 sm:mt-8 sm:gap-4"
          >
            <Link
              href="/shop"
              className="rounded-full bg-accent px-7 py-3 text-center font-body text-sm font-semibold text-bg transition-transform hover:scale-105"
            >
              Shop New Arrivals
            </Link>
            <Link
              href="/categories"
              className="rounded-full border border-white/15 px-7 py-3 text-center font-body text-sm font-semibold text-ink backdrop-blur-sm transition-colors hover:border-accent/50 hover:text-accent"
            >
              Explore Categories
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.9, ease }}
          className="relative hidden w-full md:block"
        >
          <ProductStack products={spotlightList} onChangeIndex={setActiveIndex} />

          {/* Desktop-only diagonal stamp — evokes a contact-sheet frame
              number, deliberately raw/off-grid rather than a clean UI chip. */}
          {spotlightCount > 0 && (
            <motion.div
              initial={{ opacity: 0, rotate: -8, scale: 0.9 }}
              animate={{ opacity: 1, rotate: -8, scale: 1 }}
              transition={{ delay: 1.3, duration: 0.5, ease }}
              className="pointer-events-none absolute bottom-6 left-6 z-10"
            >
              <div className="border border-ink/40 px-3 py-1.5">
                <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] text-ink/70">
                  {spotlightLabel}
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Mobile version of ProductStack — same component, rendered
            outside the "hidden md:block" wrapper above so the corner tag
            (desktop-only) never appears here. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.9, ease }}
          className="relative w-full md:hidden"
        >
          <ProductStack products={spotlightList} onChangeIndex={setActiveIndex} />
        </motion.div>
      </div>
    </section>
  );
}