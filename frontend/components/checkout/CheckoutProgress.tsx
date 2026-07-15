"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/src/lib/utils";

const steps = ["Shipping", "Payment", "Review"];

export default function CheckoutProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="sticky top-20 z-40 border-b border-white/5 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto max-w-3xl px-6 py-5">
        <div className="flex items-center">
          {steps.map((label, i) => {
            const step = (i + 1) as 1 | 2 | 3;
            const isDone = step < current;
            const isActive = step === current;
            return (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: isDone || isActive ? "var(--color-accent)" : "transparent",
                      borderColor: isDone || isActive ? "var(--color-accent)" : "rgba(255,255,255,0.15)",
                    }}
                    transition={{ duration: 0.4 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border font-mono text-xs font-semibold"
                  >
                    {isDone ? (
                      <Check size={14} className="text-bg" />
                    ) : (
                      <span className={isActive ? "text-bg" : "text-muted"}>{step}</span>
                    )}
                  </motion.div>
                  <span className={cn("font-body text-xs", isActive ? "text-ink" : "text-muted")}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="relative mx-2 -translate-y-3 h-px flex-1 bg-white/10">
                    <motion.div
                      initial={false}
                      animate={{ width: isDone ? "100%" : "0%" }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-y-0 left-0 bg-accent"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}