"use client";
import { useSiteSettingsStore } from "@/src/hooks/useSiteSettingsStore";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Tag, Trash2, Truck } from "lucide-react";
import { useCartStore } from "@/src/hooks/useCartStore";
import { useCheckoutStore } from "@/src/hooks/useCheckoutStore";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { computeTotals } from "@/src/lib/order";
import { getDisplayPrice, formatMoney } from "@/src/lib/currency";
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
  const revalidatePromo = useCheckoutStore((s) => s.revalidatePromo);
  const promoRevalidating = useCheckoutStore((s) => s.promoRevalidating);
  const shipping = useCheckoutStore((s) => s.shipping);

  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const symbols = useCurrencyStore((s) => s.symbols);
  const symbol = symbols[currency] ?? currency;

  const [promoInput, setPromoInput] = useState(promoCode);
  const [promoError, setPromoError] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);

  // Optional pincode for an accurate shipping estimate before checkout —
  // prefilled from a previously-saved shipping address if one exists.
  const [pincode, setPincode] = useState(shipping?.zip ?? "");

  const showToast = useToastStore((s) => s.show);
  const shippingSettings = useSiteSettingsStore(
    useShallow((s) => ({
      freeShippingThreshold: s.freeShippingThreshold,
      shippingFee: s.shippingFee,
      taxRate: s.taxRate,
      codFee: s.codFee,
    }))
  );

  // Re-validate whatever promo is currently stored every single time the
  // cart is visited — covers back-button navigation, a fresh visit, or
  // arriving here after adding an item elsewhere. A stale/deactivated code
  // gets cleared automatically instead of silently continuing to apply.
  useEffect(() => {
    revalidatePromo();
  }, [revalidatePromo]);

  const lineDisplays = items.map((item) => ({
    item,
    display: getDisplayPrice(item, currency, rates),
  }));
  const subtotal = lineDisplays.reduce((sum, { item, display }) => sum + display.price * item.qty, 0);
  const anyEstimated = lineDisplays.some(({ display }) => display.estimated);

  const totalWeightKg = items.reduce((sum, i) => sum + (i.weight ?? 0.3) * i.qty, 0);
  const effectivePincode = pincode.trim() || shipping?.zip || null;

  const { discount, shippingFee, tax, total, shippingZone } = computeTotals({
    subtotal,
    discountPercent,
    paymentMethod: null,
    settings: shippingSettings,
    currency,
    rates,
    totalWeightKg,
    destinationPincode: effectivePincode,
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
          {lineDisplays.map(({ item, display }, i) => (
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
                <p className="mt-1 font-mono text-sm text-muted">
                  {display.estimated && <span className="text-muted/70">~</span>}
                  {formatMoney(display.price, currency, symbol)}
                </p>

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
                <span className="font-mono text-sm text-ink">
                  {formatMoney(display.price * item.qty, currency, symbol)}
                </span>
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
            <p className="mt-1.5 font-mono text-[11px] text-accent">
              {promoRevalidating ? "Checking promo…" : `${discountPercent}% off applied`}
            </p>
          )}

          {/* Shipping estimate — pincode is optional here; without it we
              default to the standard India rate as a conservative estimate.
              The real rate is locked in once the shipping address step
              collects a confirmed pincode. */}
          <div className="mt-4 rounded-xl border border-white/10 bg-bg p-3">
            <div className="flex items-center gap-2 font-body text-xs text-muted">
              <Truck size={13} /> Estimate shipping
            </div>
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="Enter pincode for exact cost"
              maxLength={6}
              className="mt-2 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 font-mono text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
            />
            {shippingZone && (
              <p className="mt-1.5 font-mono text-[10px] text-muted">
                {shippingZone === "punjab" ? "Shipping within Punjab" : "Shipping within India"}
              </p>
            )}
          </div>

          <div className="mt-5 space-y-2 border-t border-white/5 pt-4 font-body text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="text-ink">
                {anyEstimated && <span className="text-muted/70">~</span>}
                {formatMoney(subtotal, currency, symbol)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-muted">
                <span>Discount</span>
                <span className="text-accent">-{formatMoney(discount, currency, symbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>Shipping{!effectivePincode && shippingFee > 0 ? " (est.)" : ""}</span>
              <span className="text-ink">{shippingFee === 0 ? "Free" : formatMoney(shippingFee, currency, symbol)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Estimated tax</span>
              <span className="text-ink">{formatMoney(tax, currency, symbol)}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2 font-mono text-base">
              <span className="text-ink">Total</span>
              <span className="text-ink">{formatMoney(total, currency, symbol)}</span>
            </div>
          </div>
          {anyEstimated && (
            <p className="mt-2 font-mono text-[10px] text-muted">Converted estimate — exact pricing shown at checkout.</p>
          )}

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