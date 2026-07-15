"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Product } from "@/src/types";
import ProductStack from "./ProductStack";

const ease = [0.16, 1, 0.3, 1] as const;

interface HeroProps {
  heroHeadlineLines: string[];
  heroSubtext: string;
  heroImage: string;
  products: Product[];
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

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-20 pt-32 md:grid-cols-2 md:pb-28 md:pt-36">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease }}
            className="mb-4 inline-block rounded-full border border-accent/30 px-3 py-1 font-mono text-xs uppercase tracking-widest text-accent"
          >
            New Season Drop
          </motion.span>

          <h1 className="font-display text-6xl font-bold leading-[0.95] tracking-tight text-ink sm:text-7xl lg:text-8xl">
            {heroHeadlineLines.map((line, i) => (
              <span key={`${line}-${i}`} className="block overflow-hidden">
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
            className="mt-6 max-w-md font-body text-muted"
          >
            {heroSubtext}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.92, duration: 0.5, ease }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <Link
              href="/shop"
              className="rounded-full bg-accent px-7 py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-105"
            >
              Shop New Arrivals
            </Link>
            <Link
              href="/categories"
              className="rounded-full border border-white/15 px-7 py-3 font-body text-sm font-semibold text-ink backdrop-blur-sm transition-colors hover:border-accent/50 hover:text-accent"
            >
              Explore Categories
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.9, ease }}
          className="relative"
        >
          <ProductStack products={spotlightList} onChangeIndex={setActiveIndex} />
        </motion.div>
      </div>
    </section>
  );
}