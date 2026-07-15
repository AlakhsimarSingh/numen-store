"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

export default function CurrencySwitcher() {
  const [open, setOpen] = useState(false);
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);
  const loadRates = useCurrencyStore((s) => s.loadRates);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const active = currencies.find((c) => c.code === currency) ?? currencies[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 font-mono text-xs text-ink/80 transition-colors hover:text-accent"
      >
        {active.symbol} {active.code}
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15, ease }}
              className="absolute right-0 top-full z-40 mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-2xl"
            >
              {currencies.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCurrency(c.code, true);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3.5 py-2.5 font-body text-xs transition-colors",
                    c.code === currency ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface2 hover:text-ink"
                  )}
                >
                  <span>{c.label}</span>
                  <span className="font-mono">{c.symbol}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}