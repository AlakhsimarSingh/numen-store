"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Leaf, Sparkles, Truck, Users, Volume2, VolumeX } from "lucide-react";
import { fetchCategories, Category } from "@/src/lib/categories";

const ease = [0.16, 1, 0.3, 1] as const;

const values = [
  {
    icon: Sparkles,
    title: "Premium, not pretentious",
    desc: "Quality fits and finishes without the markup that comes with a logo alone.",
  },
  {
    icon: Truck,
    title: "Fast, honest shipping",
    desc: "Real delivery windows, no surprise fees buried at checkout.",
  },
  {
    icon: Leaf,
    title: "Made to last",
    desc: "We'd rather sell you fewer things that hold up than more that don't.",
  },
  {
    icon: Users,
    title: "Built with our community",
    desc: "Drops are shaped by what our customers actually ask for.",
  },
];

// A genuine sequence — how a drop actually gets made — so numbering it is
// warranted rather than decorative.
const process = [
  {
    step: "01",
    title: "Sourcing",
    desc: "We work directly with a small number of manufacturers we've vetted in person, not a marketplace of anonymous suppliers.",
  },
  {
    step: "02",
    title: "Quality check",
    desc: "Every style is sampled and worn before it's listed. If it doesn't hold up to a week of real use, it doesn't go live.",
  },
  {
    step: "03",
    title: "The drop",
    desc: "Limited runs, released weekly, priced against the product — not against how much markup the category can carry.",
  },
];

// Same hand-picked browsing order used on the homepage category grid, so
// "What we carry" reads in the same sequence a shopper already knows.
// Matched against category.name (case-insensitive, partial match) since
// slugs weren't available — swap to slug matching if you'd rather.
const CATEGORY_ORDER = [
  "sneakers",
  "formal shoes",
  "slippers",
  "watches",
  "shades",
  "purse",
  "perfumes",
];

function orderRank(category: Category): number {
  const name = category.name.toLowerCase();
  const idx = CATEGORY_ORDER.findIndex((key) => name.includes(key));
  return idx === -1 ? CATEGORY_ORDER.length : idx;
}

export default function AboutPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  // Respect the OS-level "reduce motion" preference by pausing rather than
  // never mounting the <video> — this way the poster frame it lands on is
  // still the correct, current frame rather than a separately-served image
  // that could drift out of sync with the video asset.
  useEffect(() => {
    if (!videoRef.current) return;
    if (reducedMotion) {
      videoRef.current.pause();
    } else if (!videoFailed) {
      // Must start muted — browsers block autoplay-with-sound outright, so
      // an unmuted autoplay attempt would just fail and never play at all.
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {
        // Autoplay can still be blocked entirely (e.g. data-saver mode) —
        // fall back to the static poster silently.
        setVideoFailed(true);
      });
    }
  }, [reducedMotion, videoFailed]);

  function toggleSound() {
    if (!videoRef.current) return;
    const next = !soundOn;
    videoRef.current.muted = !next;
    if (next) {
      // Some browsers pause on an unmute attempted outside a fresh user
      // gesture chain — this click is that gesture, so re-assert play.
      videoRef.current.play().catch(() => {});
    }
    setSoundOn(next);
  }

  const showStaticFallback = videoFailed;
  const sortedCategories = [...categories].sort((a, b) => orderRank(a) - orderRank(b));

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate flex min-h-[78vh] items-end overflow-hidden border-b border-white/5 bg-surface">
        {showStaticFallback ? (
          // Fallback: the poster image on its own, in case the video asset
          // is missing, fails to decode, or autoplay was blocked.
          <Image
            src="/about-hero-poster.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            poster="/about-hero-poster.jpg"
            autoPlay={!reducedMotion}
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
          >
            {/* Place the real file at frontend/public/about-hero.mp4. The
                owner's voiceover needs to be the audio track baked into
                this file itself — there's no separate audio source here.
                Add a .webm alongside it for smaller file size / broader
                codec support if you have one. */}
            <source src="/about-hero.mp4" type="video/mp4" />
          </video>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/10" />

        {/* Sound toggle — quiet by design, bottom-right, no label shouting
            for attention. Only rendered once the video is actually playing
            (hidden on the static-poster fallback, since there's nothing to
            unmute there). */}
        {!showStaticFallback && (
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? "Mute video" : "Unmute video"}
            className="absolute bottom-6 right-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white/80 backdrop-blur-sm transition-colors hover:border-white/40 hover:text-white"
          >
            {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        )}

        <div className="relative mx-auto w-full max-w-4xl px-6 pb-16 pt-32 text-center">
          {/* <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="font-mono text-xs uppercase tracking-widest text-accent"
          >
            Our story
          </motion.p> */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease }}
            className="mt-4 font-display text-4xl font-bold text-ink sm:text-6xl"
          >
            Wear the drop, not the markup.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease }}
            className="mx-auto mt-5 max-w-xl font-body text-base text-muted"
          >
            NUMEN started as a simple frustration: premium fits shouldn&apos;t require premium patience or a premium
            bank account.
          </motion.p>
        </div>
      </section>

      {/* ---------- Narrative ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease }}
          >
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              Built for people who buy less, but better.
            </h2>
            <div className="mt-5 space-y-4 font-body text-sm leading-relaxed text-muted sm:text-base">
              <p>
                We got tired of watching the same two things happen to good products: either the price got inflated
                to pay for a name, or the quality got cut to hit a price. Neither felt honest, so we built NUMEN
                around a simpler rule — the price should track the product, not the marketing around it.
              </p>
              <p>
                That means working with a small set of manufacturers we trust, checking every style ourselves before
                it&apos;s listed, and dropping new pieces in limited runs rather than sitting on a warehouse of
                unsold stock. It&apos;s slower than mass production. It&apos;s also the only way we&apos;ve found to
                keep both the quality and the price honest at the same time.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.1, duration: 0.5, ease }}
            className="flex flex-col justify-between gap-6 border-l border-white/10 pl-6"
          >
            <div>
              <p className="font-display text-4xl font-bold text-ink">{categories.length}</p>
              <p className="mt-1 font-body text-sm text-muted">categories, from footwear to fragrance</p>
            </div>
            <div>
              <p className="font-display text-4xl font-bold text-ink">Weekly</p>
              <p className="mt-1 font-body text-sm text-muted">new drops, kept in limited runs</p>
            </div>
            <div>
              <p className="font-display text-4xl font-bold text-ink">Direct</p>
              <p className="mt-1 font-body text-sm text-muted">sourcing — no marketplace middlemen</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- Process ---------- */}
      <section className="border-y border-white/5 bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease }}
            className="max-w-xl"
          >
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">How a drop happens</h2>
            <p className="mt-3 font-body text-sm text-muted">
              Three steps, in this order, every time — nothing ships without going through all three.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            {process.map((p, i) => (
              <motion.div
                key={p.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.1, ease }}
                className="border-t border-white/10 pt-5"
              >
                <p className="font-mono text-xs text-accent">{p.step}</p>
                <h3 className="mt-3 font-body text-base font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-muted">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Values ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => {
            const Icon = v.icon;
            return (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.08, ease }}
                className="rounded-2xl border border-white/5 bg-surface p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 font-body text-sm font-semibold text-ink">{v.title}</h3>
                <p className="mt-2 font-body text-xs leading-relaxed text-muted">{v.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ---------- Categories showcase ---------- */}
      {sortedCategories.length > 0 && (
        <section className="border-t border-white/5 bg-surface">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-widest text-accent">What we carry</p>
            <div className="mt-5 flex flex-wrap gap-x-3 gap-y-4">
              {sortedCategories.map((c, i) => (
                <motion.span
                  key={c.slug}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.3, delay: i * 0.03, ease }}
                  className="font-display text-2xl font-medium text-ink/80 sm:text-3xl"
                >
                  {c.name}
                  {i < sortedCategories.length - 1 && <span className="ml-3 text-ink/20">/</span>}
                </motion.span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- CTA ---------- */}
      <section className="border-t border-white/5 bg-surface">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-20 text-center">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">Ready to find your fit?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/shop"
              className="rounded-full bg-accent px-7 py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-105"
            >
              Shop New Arrivals
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-white/15 px-7 py-3 font-body text-sm font-semibold text-ink transition-colors hover:border-accent/50 hover:text-accent"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}