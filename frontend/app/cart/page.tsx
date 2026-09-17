"use client";
import { useSiteSettingsStore } from "@/src/hooks/useSiteSettingsStore";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Minus, Plus, PartyPopper, ShoppingBag, Store, Tag, Trash2, X } from "lucide-react";
import { useCartStore } from "@/src/hooks/useCartStore";
import { useCheckoutStore } from "@/src/hooks/useCheckoutStore";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { computeTotals } from "@/src/lib/order";
import { getDisplayPrice, formatMoney } from "@/src/lib/currency";
import { useToastStore } from "@/src/hooks/useToastStore";
import { useShallow } from "zustand/react/shallow";
import PartnerPicker from "@/components/checkout/PartnerPicker";

const ease = [0.16, 1, 0.3, 1] as const;

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);

  const promoCode = useCheckoutStore((s) => s.promoCode);
  const promoBusinessName = useCheckoutStore((s) => s.promoBusinessName);
  const discountPercent = useCheckoutStore((s) => s.discountPercent);
  const applyPromo = useCheckoutStore((s) => s.applyPromo);
  const revalidatePromo = useCheckoutStore((s) => s.revalidatePromo);
  const clearPromo = useCheckoutStore((s) => s.clearPromo);
  const promoRevalidating = useCheckoutStore((s) => s.promoRevalidating);

  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const symbols = useCurrencyStore((s) => s.symbols);
  const symbol = symbols[currency] ?? currency;

  const [promoInput, setPromoInput] = useState(promoCode);
  const [promoError, setPromoError] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const showToast = useToastStore((s) => s.show);
  const shippingSettings = useSiteSettingsStore(
    useShallow((s) => ({
      freeShippingThreshold: s.freeShippingThreshold,
      shippingFee: s.shippingFee,
      taxRate: s.taxRate,
      codFee: s.codFee,
    }))
  );

  // A code has been mandatory since checkout was gated on it — but state
  // persisted from before that rollout, or from days ago, might no longer
  // be valid (deactivated, expired). Re-check on every mount so a stale
  // "applied" state can't silently let someone through who shouldn't be.
  useEffect(() => {
    const hadPromo = !!useCheckoutStore.getState().promoCode;
    if (!hadPromo) return;
    revalidatePromo().then(() => {
      const stillHasPromo = !!useCheckoutStore.getState().promoCode;
      if (!stillHasPromo) {
        showToast("Your representative signature was no longer valid and has been removed — please add another to continue.", "info");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the input field in sync if revalidation (or a manual clear)
  // changes the code out from under it, or if the store hydrates after
  // this component's initial render, since persisted zustand state isn't
  // available synchronously on first paint.
  useEffect(() => {
    setPromoInput(promoCode);
  }, [promoCode]);

  // Each line's display price honors that product's regional override if
  // one exists, falling back to rate conversion — same logic as the
  // product page, applied per item rather than to a single aggregate.
  // compareAtDisplay reuses the exact same currency/regional-override
  // logic by running the item's compareAtPrice through getDisplayPrice —
  // so an MRP quoted in the product's base currency converts the same
  // way the live price does. Only present when the item genuinely has a
  // compareAtPrice set on it (no invented markups).
  const lineDisplays = items.map((item) => {
    const display = getDisplayPrice(item, currency, rates);
    const compareAtDisplay =
      item.compareAtPrice && item.compareAtPrice > item.price
        ? getDisplayPrice({ ...item, price: item.compareAtPrice }, currency, rates)
        : null;
    return { item, display, compareAtDisplay };
  });
  const subtotal = lineDisplays.reduce((sum, { item, display }) => sum + display.price * item.qty, 0);
  const anyEstimated = lineDisplays.some(({ display }) => display.estimated);

  // Genuine markdown savings — sum of (MRP - current price) across lines
  // that actually have a compareAtPrice. This is never synthesized; it's
  // zero unless real data backs it.
  const markdownSavings = lineDisplays.reduce((sum, { item, display, compareAtDisplay }) => {
    if (!compareAtDisplay) return sum;
    return sum + (compareAtDisplay.price - display.price) * item.qty;
  }, 0);

  // Shipping is deliberately NOT computed here — it needs a destination
  // pincode, which doesn't exist until the shipping-details step. Only
  // discount/tax come from computeTotals; the shipping-exclusive total is
  // built manually below. The real, final total (shipping included) is
  // computed on /checkout/payment once weight + destination pincode are
  // both known.
  const { discount, tax } = computeTotals({
    subtotal,
    discountPercent,
    paymentMethod: null,
    settings: shippingSettings,
    currency,
    rates,
  });
  const discounted = Math.max(0, subtotal - discount);
  const totalExcludingShipping = Math.round((discounted + tax) * 100) / 100;

  // "Market Value" is the pre-markdown, pre-discount reference price
  // (subtotal + markdownSavings). "Our Value" is what the customer
  // actually pays before shipping (totalExcludingShipping). The savings
  // banner is now literally that difference, rather than summing
  // markdown + discount separately — so it reflects tax too.
  const marketValue = subtotal + markdownSavings;
  const numensValue = totalExcludingShipping;
  const totalSavings = marketValue - numensValue;

  // Scale factor to convert each line's raw (pre-discount/tax) price into
  // its proportional share of Our Value, so the per-item prices shown
  // in the list agree with the "Our Value" total in the summary card
  // instead of just summing to the plain subtotal.
  const numensValueFactor = subtotal > 0 ? numensValue / subtotal : 1;

  // A code (any code — even 0% discount) is now required to proceed past
  // this page, since it's how orders get attributed to a partner business.
  const hasCode = !!promoCode;

  async function handleApplyPromo() {
    setPromoApplying(true);
    const ok = await applyPromo(promoInput.trim());
    setPromoError(ok ? "" : "That representative signature isn't valid.");
    showToast(ok ? "♥ WELCOME TO NUMEN" : "Invalid representative signature", ok ? "success" : "error");
    if (ok) {
      // Minimal glitch-flash celebration on the successful reveal — brief,
      // self-dismissing, and purely decorative (never blocks input).
      setShowWelcome(true);
      window.setTimeout(() => setShowWelcome(false), 1500);
    }
    setPromoApplying(false);
  }

  function handleClearPromo() {
    clearPromo();
    setPromoInput("");
    setPromoError("");
    showToast("Representative signature removed", "info");
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
          {lineDisplays.map(({ item, display, compareAtDisplay }, i) => (
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
                {compareAtDisplay && (
                  <p className="mt-0.5 font-mono text-[11px] text-muted/60">
                    Market Value <span className="line-through">{formatMoney(compareAtDisplay.price, currency, symbol)}</span>
                  </p>
                )}

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
                <span className="flex items-baseline gap-1 font-mono text-sm text-ink">
                  {display.estimated && <span className="text-muted/70">~</span>}
                  {formatMoney(display.price * item.qty * numensValueFactor, currency, symbol)}
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

          {hasCode ? (
            <div className="mt-4 flex items-center justify-between gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Tag size={14} className="shrink-0 text-accent" />
                <span className="truncate font-mono text-sm text-ink">{promoCode}</span>
                {discountPercent > 0 ? (
                  <span className="shrink-0 font-mono text-[11px] text-accent">{discountPercent}% off</span>
                ) : (
                  promoBusinessName && (
                    <span className="shrink-0 truncate font-body text-[11px] text-muted">— {promoBusinessName}</span>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={handleClearPromo}
                aria-label="Remove representative signature"
                className="shrink-0 text-muted hover:text-accent2"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-bg px-4 py-2.5">
                  <Tag size={14} className="text-muted" />
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Representative signature"
                    disabled={promoRevalidating}
                    className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none disabled:opacity-60"
                  />
                  {promoRevalidating && <Loader2 size={14} className="shrink-0 animate-spin text-muted" />}
                </div>
                <button
                  onClick={handleApplyPromo}
                  disabled={promoApplying || promoRevalidating}
                  className="rounded-full border border-white/10 px-4 py-2.5 font-body text-xs text-ink hover:border-accent/50 hover:text-accent disabled:opacity-60"
                >
                  {promoApplying ? "Checking…" : "Apply"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-2 flex items-center gap-1.5 font-body text-xs text-accent hover:underline"
              >
                {/* <Store size={12} /> Don&apos;t have a representative signature? Connect with a seller */}
              </button>
            </>
          )}
          {promoError && <p className="mt-1.5 font-mono text-[11px] text-accent2">{promoError}</p>}

          {/* Combined savings banner: Market Value - Our Value, shown
              as one graceful line above the breakdown. Only renders when
              there's something real to show. */}
          {totalSavings > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5">
              <PartyPopper size={15} className="shrink-0 text-accent" />
              <p className="font-body text-xs text-ink">
                You're saving <span className="font-semibold text-accent">{formatMoney(totalSavings, currency, symbol)}</span> on this order
              </p>
            </div>
          )}

          <div className="mt-5 space-y-2 border-t border-white/5 pt-4 font-body text-sm">
            {markdownSavings > 0 && (
              <div className="flex justify-between text-muted">
                <span>Market Value</span>
                <span className="text-muted line-through">
                  {formatMoney(marketValue, currency, symbol)}
                </span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-muted">
                <span>Discount</span>
                <span className="text-accent">-{formatMoney(discount, currency, symbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              <span className="font-mono text-xs uppercase tracking-wide text-muted">Calculated at checkout</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2 font-mono text-base">
              <span className="text-ink">Our Cost</span>
              <span className="text-ink">
                {anyEstimated && <span className="text-muted/70">~</span>}
                {formatMoney(numensValue, currency, symbol)}
              </span>
            </div>
            <p className="text-right font-mono text-[9px] text-muted/40">
              incl. taxes &amp; accessories, excl. shipping
            </p>
          </div>
          <p className="mt-2 font-mono text-[10px] text-muted">
            Shipping is calculated at checkout based on your delivery address.
          </p>
          {anyEstimated && (
            <p className="mt-1 font-mono text-[10px] text-muted">Converted estimate — exact pricing shown at checkout.</p>
          )}

          {hasCode ? (
            <Link
              href="/checkout/shipping"
              className="mt-5 block rounded-full bg-accent py-3.5 text-center font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01]"
            >
              Proceed to Checkout
            </Link>
          ) : (
            <div className="mt-5">
              <button
                type="button"
                disabled
                className="block w-full cursor-not-allowed rounded-full bg-surface2 py-3.5 text-center font-body text-sm font-semibold text-muted"
              >
                Proceed to Checkout
              </button>
              <p className="mt-2 text-center font-mono text-[10px] text-muted">
                Add a representative signature or connect with a seller above to continue.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {pickerOpen && <PartnerPicker onClose={() => setPickerOpen(false)} />}

      {/* Minimal glitch-flash celebration, fired once on a successful
          signature apply. Purely decorative and non-blocking — it sits
          above the page for a beat, then dissolves on its own. */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-bg/85 backdrop-blur-[2px]"
          >
            <div className="glitch-wrap relative text-center">
              <span className="glitch-layer glitch-base block font-display text-2xl font-bold uppercase tracking-[0.25em] text-ink sm:text-4xl">
                Welcome to Numen
              </span>
              <span
                aria-hidden
                className="glitch-layer glitch-a absolute inset-0 block font-display text-2xl font-bold uppercase tracking-[0.25em] text-accent sm:text-4xl"
              >
                Welcome to Numen
              </span>
              <span
                aria-hidden
                className="glitch-layer glitch-b absolute inset-0 block font-display text-2xl font-bold uppercase tracking-[0.25em] text-accent2 sm:text-4xl"
              >
                Welcome to Numen
              </span>
              <motion.span
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5, ease }}
                className="mx-auto mt-4 block h-px w-24 origin-center bg-accent/70"
              />
            </div>

            <style jsx>{`
              .glitch-wrap {
                display: inline-block;
              }
              .glitch-layer {
                white-space: nowrap;
              }
              .glitch-base {
                position: relative;
                animation: glitchFlicker 1.3s steps(1, end) 1;
              }
              .glitch-a,
              .glitch-b {
                opacity: 0;
                mix-blend-mode: screen;
              }
              .glitch-a {
                animation: glitchShiftA 1.3s steps(1, end) 1;
              }
              .glitch-b {
                animation: glitchShiftB 1.3s steps(1, end) 1;
              }
              @keyframes glitchFlicker {
                0% { opacity: 0; }
                6% { opacity: 1; }
                9% { opacity: 0.25; }
                12% { opacity: 1; }
                45% { opacity: 1; }
                48% { opacity: 0.35; }
                51% { opacity: 1; }
                100% { opacity: 1; }
              }
              @keyframes glitchShiftA {
                0% { opacity: 0; transform: translate(0, 0); }
                7% { opacity: 0.85; transform: translate(-4px, 1px); }
                14% { transform: translate(3px, -1px); }
                21% { transform: translate(-2px, 0); }
                28% { opacity: 0.6; transform: translate(0, 0); }
                100% { opacity: 0; transform: translate(0, 0); }
              }
              @keyframes glitchShiftB {
                0% { opacity: 0; transform: translate(0, 0); }
                7% { opacity: 0.85; transform: translate(4px, -1px); }
                14% { transform: translate(-3px, 1px); }
                21% { transform: translate(2px, 0); }
                28% { opacity: 0.6; transform: translate(0, 0); }
                100% { opacity: 0; transform: translate(0, 0); }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}