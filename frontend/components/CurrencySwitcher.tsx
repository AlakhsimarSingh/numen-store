"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

// Rough per-row height used to estimate whether the dropdown will fit
// below the trigger before it's even rendered (we need to know this at
// the moment of opening, to pick a direction, not after).
const ROW_HEIGHT_ESTIMATE = 40;
const DROPDOWN_PADDING_ESTIMATE = 16;
const VIEWPORT_MARGIN = 12;

export default function CurrencySwitcher() {
  const [open, setOpen] = useState(false);
  // Whether the dropdown opens upward (above the trigger) instead of the
  // default downward — decided at open-time based on available viewport
  // space, so this same component behaves correctly whether it's near the
  // top of the screen (desktop header) or the bottom (mobile nav overlay).
  const [openUpward, setOpenUpward] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);
  const loadRates = useCurrencyStore((s) => s.loadRates);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const active = currencies.find((c) => c.code === currency) ?? currencies[0];

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const estimatedDropdownHeight = currencies.length * ROW_HEIGHT_ESTIMATE + DROPDOWN_PADDING_ESTIMATE;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Prefer opening downward (the natural default) unless there isn't
      // enough room for it but there IS enough room above — e.g. the
      // switcher sitting in the mobile nav's bottom bar.
      setOpenUpward(spaceBelow < estimatedDropdownHeight + VIEWPORT_MARGIN && spaceAbove > spaceBelow);
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={handleToggle}
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
              initial={{ opacity: 0, y: openUpward ? -6 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: openUpward ? -6 : 6 }}
              transition={{ duration: 0.15, ease }}
              className={cn(
                "absolute right-0 z-40 max-h-[min(60vh,20rem)] w-40 overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-surface shadow-2xl",
                openUpward ? "bottom-full mb-2" : "top-full mt-2"
              )}
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