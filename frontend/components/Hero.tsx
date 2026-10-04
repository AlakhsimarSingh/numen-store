"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Product } from "@/src/types";
import ProductStack from "./ProductStack";
import HeroSupportBadge from "./home/HeroSupportBadge";

const ease = [0.16, 1, 0.3, 1] as const;
const LOOP_GAP_MS = 1000;
const MEDIA_FILTER = "saturate(0.75) contrast(1.08) brightness(0.55)";

// Stable no-op: the old `useState` setter re-rendered the ENTIRE hero (headline,
// badge, both stacks...) every time the stack changed slide, for a value nobody read.
const noop = () => {};

// Same feTurbulence grain as before, but as a tiled data-URI background. The
// browser rasterises it once and caches the bitmap instead of re-evaluating an
// SVG filter over a full-screen blended layer on top of a playing video.
const GRAIN_BG = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>"
)}")`;

interface HeroProps {
  heroHeadlineLines: string[];
  heroSubtext: string;
  heroImage: string;
  heroVideoDesktop?: string;
  heroVideoMobile?: string;
  products: Product[];
  customerCareNumber?: string;
  customerCareWhatsapp?: string;
}

function getHeadlineLineStyle(line: string): CSSProperties {
  const len = line.trim().length;
  if (len <= 4) return { fontSize: "clamp(4.5rem, 5vw + 3.5rem, 10rem)" };
  if (len <= 7) return { fontSize: "clamp(3.75rem, 4.5vw + 3rem, 8.75rem)" };
  if (len <= 11) return { fontSize: "clamp(3.25rem, 4vw + 2.25rem, 7.5rem)" };
  return { fontSize: "clamp(2.75rem, 3.5vw + 1.75rem, 6.25rem)" };
}

/** null until mounted, so server HTML and first client render always match. */
function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)"); // Tailwind `md`
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

/**
 * Background media. Differences vs. before (same visuals):
 *  - ONE <Image priority> is always the LCP element and the poster, so the hero
 *    paints from the optimised image immediately.
 *  - Only the video for the current breakpoint is mounted (previously both the
 *    desktop AND mobile videos were in the DOM and downloaded).
 *  - Video pauses when the hero scrolls out of view (it was decoding + running a
 *    CSS filter underneath the page for the entire scroll = scroll jank).
 *  - The 1s gap between loops is preserved.
 */
function HeroMedia({ heroImage, videoSrc }: { heroImage: string; videoSrc?: string }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let visible = true;
    let needsReplay = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const replay = () => {
      el.currentTime = 0;
      el.play().catch(() => {});
    };

    const onEnded = () => {
      timer = setTimeout(() => {
        timer = undefined;
        if (visible) replay();
        else needsReplay = true;
      }, LOOP_GAP_MS);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        el.pause();
        return;
      }
      if (needsReplay) {
        needsReplay = false;
        replay();
      } else if (el.paused && !el.ended && !timer) {
        el.play().catch(() => {});
      }
    });

    el.addEventListener("ended", onEnded);
    io.observe(el);
    return () => {
      el.removeEventListener("ended", onEnded);
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [videoSrc]);

  return (
    <>
      {!playing && (
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ filter: MEDIA_FILTER }}
        />
      )}
      {videoSrc && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="metadata"
          onPlaying={() => setPlaying(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: MEDIA_FILTER, opacity: playing ? 1 : 0 }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
    </>
  );
}

export default function Hero({
  heroHeadlineLines,
  heroSubtext,
  heroImage,
  heroVideoDesktop,
  heroVideoMobile,
  products,
  customerCareNumber,
  customerCareWhatsapp,
}: HeroProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isDesktop = useIsDesktop();
  const rawVideo = isDesktop === null ? undefined : isDesktop ? heroVideoDesktop : heroVideoMobile;
  const videoSrc = !reducedMotion && rawVideo ? rawVideo : undefined;

  // `products` is already the server-picked hero list (spotlighted, else newest 5).
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
          style={{ willChange: "transform, opacity" }}
        >
          <HeroMedia key={videoSrc ?? "image"} heroImage={heroImage} videoSrc={videoSrc} />
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-bg/20 md:via-bg/50 md:to-transparent" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(11,11,12,0.55) 100%)" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{ backgroundImage: GRAIN_BG, backgroundSize: "300px 300px" }}
        />
      </div>

      <HeroSupportBadge phone={customerCareNumber} whatsapp={customerCareWhatsapp} />

      <div className="mx-auto flex max-w-7xl flex-col items-start gap-9 px-6 pb-14 pt-28 sm:gap-11 md:grid md:grid-cols-2 md:items-center md:gap-10 md:pb-28 md:pt-36">
        <div className="relative flex w-full flex-col items-start text-left">
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
              See All Products
            </Link>
            <Link
              href="/categories"
              className="rounded-full border border-white/15 px-7 py-3 text-center font-body text-sm font-semibold text-ink backdrop-blur-sm transition-colors hover:border-accent/50 hover:text-accent"
            >
              See All Categories
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.9, ease }}
          className="relative hidden w-full md:block"
        >
          <ProductStack products={spotlightList} onChangeIndex={noop} />

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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.9, ease }}
          className="relative w-full md:hidden"
        >
          <ProductStack products={spotlightList} onChangeIndex={noop} />
        </motion.div>
      </div>
    </section>
  );
}