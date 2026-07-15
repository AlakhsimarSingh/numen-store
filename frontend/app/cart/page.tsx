"use client";
import { useSiteSettingsStore } from "@/src/hooks/useSiteSettingsStore";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Tag, Trash2 } from "lucide-react";
import { useCartStore } from "@/src/hooks/useCartStore";
import { useCheckoutStore } from "@/src/hooks/useCheckoutStore";
import { computeTotals } from "@/src/lib/order";
import { formatPrice } from "@/src/lib/utils";
import { useToastStore } from "@/src/hooks/useToastStore";
import { useShallow } from "zustand/react/shallow";
const ease = [0.16, 1, 0.3, 1] as const;

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);

  const promoCode = useCheckoutStore((s) => s.promoCode);
  const discountPercent = useCheckoutStore((s) => s.discountPercent);
  const applyPromo = useCheckoutStore((s) => s.applyPromo);

  const [promoInput, setPromoInput] = useState(promoCode);
  const [promoError, setPromoError] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const showToast = useToastStore((s) => s.show);
  const shippingSettings = useSiteSettingsStore(
    useShallow((s) => ({
      freeShippingThreshold: s.freeShippingThreshold,
      shippingFee: s.shippingFee,
      taxRate: s.taxRate,
      codFee: s.codFee,
    }))
  );
  const { discount, shippingFee, tax, total } = computeTotals({
    subtotal,
    discountPercent,
    paymentMethod: null,
    settings: shippingSettings,
  });

  async function handleApplyPromo() {
    setPromoApplying(true);
    const ok = await applyPromo(promoInput.trim());
    setPromoError(ok ? "" : "That code isn't valid.");
    showToast(ok ? `${useCheckoutStore.getState().discountPercent}% discount applied` : "Invalid promo code", ok ? "success" : "error");
    setPromoApplying(false);
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-muted">
          <ShoppingBag size={28} />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold text-ink">Your cart is empty</h1>
        <p className="mt-2 font-body text-sm text-muted">Looks like you haven&apos;t added anything yet.</p>
        <Link
          href="/shop"
          className="mt-6 rounded-full bg-accent px-6 py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-105"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="font-display text-3xl font-bold text-ink sm:text-4xl"
      >
        Your Cart
      </motion.h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((item, i) => (
            <motion.div
              key={item.productId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease }}
              className="flex items-center gap-4 rounded-2xl border border-white/5 bg-surface p-4"
            >
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-surface2">
                <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm text-ink">{item.name}</p>
                <p className="mt-1 font-mono text-sm text-muted">{formatPrice(item.price)}</p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.productId, Math.max(1, item.qty - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-muted hover:text-ink"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center font-mono text-sm text-ink">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.productId, item.qty + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-muted hover:text-ink"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <span className="font-mono text-sm text-ink">{formatPrice(item.price * item.qty)}</span>
                <button
                  onClick={() => removeItem(item.productId)}
                  aria-label="Remove item"
                  className="text-muted hover:text-accent2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease }}
          className="h-fit rounded-2xl border border-white/5 bg-surface p-6"
        >
          <h2 className="font-display text-lg font-bold text-ink">Order Summary</h2>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-bg px-4 py-2.5">
              <Tag size={14} className="text-muted" />
              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Promo code"
                className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
              />
            </div>
            <button
              onClick={handleApplyPromo}
              disabled={promoApplying}
              className="rounded-full border border-white/10 px-4 py-2.5 font-body text-xs text-ink hover:border-accent/50 hover:text-accent disabled:opacity-60"
            >
              {promoApplying ? "Checking…" : "Apply"}
            </button>
          </div>
          {promoError && <p className="mt-1.5 font-mono text-[11px] text-accent2">{promoError}</p>}
          {discountPercent > 0 && !promoError && (
            <p className="mt-1.5 font-mono text-[11px] text-accent">{discountPercent}% off applied</p>
          )}

          <div className="mt-5 space-y-2 border-t border-white/5 pt-4 font-body text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="text-ink">{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-muted">
                <span>Discount</span>
                <span className="text-accent">-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              <span className="text-ink">{shippingFee === 0 ? "Free" : formatPrice(shippingFee)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Estimated tax</span>
              <span className="text-ink">{formatPrice(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2 font-mono text-base">
              <span className="text-ink">Total</span>
              <span className="text-ink">{formatPrice(total)}</span>
            </div>
          </div>

          <Link
            href="/checkout/shipping"
            className="mt-5 block rounded-full bg-accent py-3.5 text-center font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01]"
          >
            Proceed to Checkout
          </Link>
        </motion.div>
      </div>
    </div>
  );
}