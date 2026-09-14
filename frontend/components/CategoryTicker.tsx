"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, Quote, Sparkles } from "lucide-react";

const quotes = [
  "Good taste is a quiet kind of confidence.",
  "The right fit changes the way you move.",
  "Dress like your point of view matters.",
  "Style is how you make the everyday feel considered.",
  "The best looks start with knowing yourself.",
  "Wear what feels unmistakably yours.",
];

export default function CategoryTicker() {
  const [paused, setPaused] = useState(false);
  const loop = [...quotes, ...quotes];

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden border-y border-white/5 bg-surface py-3"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 pb-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          <Sparkles size={12} className="text-accent" />
          <span>MINDSET</span>
          <span className="h-1 w-1 animate-pulse rounded-full bg-accent" />
        </div>
        <button
          type="button"
          onClick={() => setPaused((current) => !current)}
          aria-label={paused ? "Play editorial notes" : "Pause editorial notes"}
          title={paused ? "Play" : "Pause"}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          {paused ? <Play size={11} fill="currentColor" /> : <Pause size={11} fill="currentColor" />}
        </button>
      </div>

      <div
        className="flex w-max animate-marquee gap-3 px-6"
        style={{ animationPlayState: paused ? "paused" : "running" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
      >
        {loop.map((quote, i) => {
          return (
            <div
              key={`${quote}-${i}`}
              className={`group flex shrink-0 items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors duration-300 ${
                i % 3 === 1
                  ? "border-accent/30 bg-accent text-bg"
                  : "border-white/10 bg-bg/30 text-muted hover:border-accent/40 hover:text-ink"
              }`}
            >
              <Quote
                size={14}
                strokeWidth={1.8}
                className={i % 3 === 1 ? "text-bg/60" : "text-accent"}
              />
              <span className="font-display text-sm font-medium tracking-wide">{quote}</span>
              <span className="font-mono text-[9px] opacity-50">{String((i % quotes.length) + 1).padStart(2, "0")}</span>
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface to-transparent" />
    </motion.div>
  );
}