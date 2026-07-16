"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Package } from "lucide-react";
import { useCheckoutStore } from "@/src/hooks/useCheckoutStore";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { formatMoney } from "@/src/lib/currency";

const ease = [0.16, 1, 0.3, 1] as const;

export default function ConfirmationPage() {
  const router = useRouter();
  const lastOrder = useCheckoutStore((s) => s.lastOrder);
  const symbols = useCurrencyStore((s) => s.symbols);

  useEffect(() => {
    if (!lastOrder) {
      router.replace("/");
    }
  }, [lastOrder, router]);

  if (!lastOrder) return null;

  const eta = new Date(lastOrder.placedAt);
  eta.setDate(eta.getDate() + 5);

  // Always formats using what was actually charged (lastOrder.currency),
  // not whatever currency is currently selected in the navbar — a receipt
  // shouldn't change if the shopper switches currency after checking out.
  const orderCurrency = lastOrder.currency ?? "INR";
  const orderSymbol = symbols[orderCurrency] ?? orderCurrency;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent"
      >
        <CheckCircle2 size={44} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease }}
        className="mt-6 font-display text-3xl font-bold text-ink sm:text-4xl"
      >
        Order placed
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease }}
        className="mt-2 font-body text-sm text-muted"
      >
        Thanks{lastOrder.shipping.fullName ? `, ${lastOrder.shipping.fullName.split(" ")[0]}` : ""}. Your drop is on
        its way.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease }}
        className="mt-8 w-full rounded-2xl border border-white/5 bg-surface p-6 text-left"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-accent">Order number</span>
          <span className="font-mono text-sm text-ink">{lastOrder.id}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-body text-sm text-muted">Items</span>
          <span className="font-body text-sm text-ink">{lastOrder.items.length}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-body text-sm text-muted">Total paid</span>
          <span className="font-mono text-sm text-ink">{formatMoney(lastOrder.total, orderCurrency, orderSymbol)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-body text-sm text-muted">Estimated delivery</span>
          <span className="font-body text-sm text-ink">
            {eta.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-4 font-body text-xs text-muted">
          <Package size={14} className="text-accent" />
          Shipping to {lastOrder.shipping.city}, {lastOrder.shipping.state}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease }}
        className="mt-8 flex gap-4"
      >
        <Link
          href="/shop"
          className="rounded-full bg-accent px-6 py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-105"
        >
          Continue Shopping
        </Link>
        <Link
          href="/"
          className="rounded-full border border-white/15 px-6 py-3 font-body text-sm font-semibold text-ink hover:border-accent/50 hover:text-accent"
        >
          Back Home
        </Link>
      </motion.div>
    </div>
  );
}