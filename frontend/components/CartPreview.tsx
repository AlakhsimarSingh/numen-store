"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCartStore } from "@/src/hooks/useCartStore";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { getDisplayPrice, formatMoney } from "@/src/lib/currency";

const ease = [0.16, 1, 0.3, 1] as const;
const CLOSE_DELAY = 150;

export default function CartPreview() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = useCartStore((s) => s.items);
  const totalItems = useCartStore((s) => s.totalItems());
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);

  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const symbols = useCurrencyStore((s) => s.symbols);
  const symbol = symbols[currency] ?? currency;

  const lineDisplays = items.map((item) => ({ item, display: getDisplayPrice(item, currency, rates) }));
  const subtotal = lineDisplays.reduce((sum, { item, display }) => sum + display.price * item.qty, 0);
  const anyEstimated = lineDisplays.some(({ display }) => display.estimated);

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <Link href="/cart" aria-label="Cart" className="relative text-ink/80 transition-colors hover:text-accent">
        <ShoppingBag size={20} />
        {totalItems > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-bg">
            {totalItems}
          </span>
        )}
      </Link>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease }}
            className="absolute right-0 top-full z-40 mt-3 w-80 rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {items.length === 0 ? (
              <p className="py-6 text-center font-body text-sm text-muted">Your cart is empty.</p>
            ) : (
              <>
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {lineDisplays.map(({ item, display }) => (
                    <div key={item.productId} className="flex items-center gap-3">
                      <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-surface2">
                        <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm text-ink">{item.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.productId, Math.max(1, item.qty - 1))}
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 text-muted hover:text-ink"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="font-mono text-xs text-ink">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.productId, item.qty + 1)}
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 text-muted hover:text-ink"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-xs text-ink">
                          {display.estimated && <span className="text-muted/70">~</span>}
                          {formatMoney(display.price * item.qty, currency, symbol)}
                        </span>
                        <button
                          onClick={() => removeItem(item.productId)}
                          aria-label="Remove item"
                          className="text-muted hover:text-accent2"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="font-body text-xs text-muted">Subtotal</span>
                  <span className="font-mono text-sm text-ink">
                    {anyEstimated && <span className="text-muted/70">~</span>}
                    {formatMoney(subtotal, currency, symbol)}
                  </span>
                </div>

                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="mt-3 block rounded-full bg-accent py-2.5 text-center font-body text-xs font-semibold text-bg transition-transform hover:scale-[1.02]"
                >
                  View cart
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}