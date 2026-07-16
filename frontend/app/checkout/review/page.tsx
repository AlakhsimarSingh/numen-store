"use client";
import { useSiteSettingsStore } from "@/src/hooks/useSiteSettingsStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, MapPin, Pencil, ShieldCheck, Tag } from "lucide-react";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";
import { useCartStore } from "@/src/hooks/useCartStore";
import { useCheckoutStore } from "@/src/hooks/useCheckoutStore";
import { useAuthStore } from "@/src/hooks/useAuthStore";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { computeTotals } from "@/src/lib/order";
import { getDisplayPrice, formatMoney } from "@/src/lib/currency";
import { useShallow } from "zustand/react/shallow";
import { createRazorpayOrder, verifyRazorpayPayment, loadRazorpayScript, openRazorpayCheckout } from "@/src/lib/payments";


const ease = [0.16, 1, 0.3, 1] as const;

export default function ReviewPage() {
  const router = useRouter();
  const { ready } = useRequireAuth();

  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const user = useAuthStore((s) => s.user);

  const shipping = useCheckoutStore((s) => s.shipping);
  const paymentMethod = useCheckoutStore((s) => s.paymentMethod);
  const promoCode = useCheckoutStore((s) => s.promoCode);
  const discountPercent = useCheckoutStore((s) => s.discountPercent);
  const applyPromo = useCheckoutStore((s) => s.applyPromo);
  const placeOrder = useCheckoutStore((s) => s.placeOrder);

  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const symbols = useCurrencyStore((s) => s.symbols);
  const symbol = symbols[currency] ?? currency;

  const [promoInput, setPromoInput] = useState(promoCode);
  const [promoError, setPromoError] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const shippingSettings = useSiteSettingsStore(
    useShallow((s) => ({
      freeShippingThreshold: s.freeShippingThreshold,
      shippingFee: s.shippingFee,
      taxRate: s.taxRate,
      codFee: s.codFee,
    }))
  );

  useEffect(() => {
    if (ready && (!shipping || !paymentMethod)) {
      router.replace(!shipping ? "/checkout/shipping" : "/checkout/payment");
    }
  }, [ready, shipping, paymentMethod, router]);

  if (!ready || !shipping || !paymentMethod) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={28} />
      </div>
    );
  }

  const lineDisplays = items.map((item) => ({
    item,
    display: getDisplayPrice(item, currency, rates),
  }));
  const subtotal = lineDisplays.reduce((sum, { item, display }) => sum + display.price * item.qty, 0);
  const anyEstimated = lineDisplays.some(({ display }) => display.estimated);

  const { discount, shippingFee, tax, codFee, total } = computeTotals({
    subtotal,
    discountPercent,
    paymentMethod,
    settings: shippingSettings,
    currency,
    rates,
  });

  async function handleApplyPromo() {
    setPromoApplying(true);
    const ok = await applyPromo(promoInput.trim());
    setPromoError(ok ? "" : "That code isn't valid.");
    setPromoApplying(false);
  }

  async function handlePlaceOrder() {
    if (!shipping || !paymentMethod) return;
    setPlacing(true);
    setOrderError("");

    const orderItems = items.map((i) => ({
      productId: i.baseId,
      qty: i.qty,
      color: i.color,
      size: i.size,
    }));

    if (paymentMethod === "cod") {
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ items: orderItems, shipping, paymentMethod: "cod", promoCode: promoCode || undefined, currency }),
        });
        const data = await res.json();
        if (!res.ok) {
          setOrderError(data.error ?? "Could not place order.");
          setPlacing(false);
          return;
        }
        placeOrder(data);
        clearCart();
        router.push("/checkout/confirmation");
      } catch {
        setOrderError("Something went wrong. Please try again.");
        setPlacing(false);
      }
      return;
    }

    // Card / UPI — Razorpay flow
    try {
      const [razorpayOrder] = await Promise.all([
        createRazorpayOrder({
          items: orderItems,
          shipping,
          paymentMethod,
          promoCode: promoCode || undefined,
          currency,
        }),
        loadRazorpayScript(),
      ]);

      openRazorpayCheckout({
        key: razorpayOrder.keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.razorpayOrderId,
        name: "NUMEN",
        description: `${items.length} item${items.length !== 1 ? "s" : ""}`,
        prefill: {
          name: shipping.fullName,
          email: user?.email,
          contact: shipping.phone,
        },
        theme: { color: "#C9FF3D" },
        handler: async (response) => {
          try {
            const order = await verifyRazorpayPayment(response);
            placeOrder(order);
            clearCart();
            router.push("/checkout/confirmation");
          } catch (err) {
            setOrderError(err instanceof Error ? err.message : "Payment verification failed.");
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setOrderError("Payment was cancelled.");
            setPlacing(false);
          },
        },
      });
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Could not start payment.");
      setPlacing(false);
    }
  }

  return (
    <div>
      <CheckoutProgress current={3} />

      <div className="mx-auto max-w-3xl px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Review your order</h1>
          <p className="mt-2 font-body text-sm text-muted">Double-check everything before you place it.</p>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-white/5 bg-surface p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
                  <MapPin size={14} /> Shipping to
                </div>
                <Link href="/checkout/shipping" className="flex items-center gap-1 font-body text-xs text-muted hover:text-accent">
                  <Pencil size={12} /> Edit
                </Link>
              </div>
              <p className="mt-2 font-body text-sm text-ink">{shipping.fullName} · {shipping.phone}</p>
              <p className="font-body text-sm text-muted">
                {shipping.addressLine1}{shipping.addressLine2 ? `, ${shipping.addressLine2}` : ""}, {shipping.city}, {shipping.state} {shipping.zip}, {shipping.country}
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-surface p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
                  <ShieldCheck size={14} /> Payment
                </div>
                <Link href="/checkout/payment" className="flex items-center gap-1 font-body text-xs text-muted hover:text-accent">
                  <Pencil size={12} /> Edit
                </Link>
              </div>
              <p className="mt-2 font-body text-sm text-ink">
                {paymentMethod === "card" && "Card (via Razorpay)"}
                {paymentMethod === "upi" && "UPI (via Razorpay)"}
                {paymentMethod === "cod" && "Cash on Delivery"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-surface p-5">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-3">
                {lineDisplays.map(({ item, display }) => (
                  <div key={item.productId} className="flex items-center gap-3">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-surface2">
                      <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm text-ink">{item.name}</p>
                      <p className="font-mono text-xs text-muted">Qty {item.qty}</p>
                    </div>
                    <span className="font-mono text-sm text-ink">
                      {formatMoney(display.price * item.qty, currency, symbol)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-surface p-5">
              <div className="flex items-center gap-2">
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
                <p className="mt-1.5 font-mono text-[11px] text-accent">{discountPercent}% off applied ({promoCode.toUpperCase()})</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/5 bg-surface p-5">
              <div className="space-y-2 font-body text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span className="text-ink">
                    {anyEstimated && <span className="text-muted/70">~</span>}
                    {formatMoney(subtotal, currency, symbol)}
                  </span>
                </div>
                {discount > 0 && <div className="flex justify-between text-muted"><span>Discount</span><span className="text-accent">-{formatMoney(discount, currency, symbol)}</span></div>}
                <div className="flex justify-between text-muted"><span>Shipping</span><span className="text-ink">{shippingFee === 0 ? "Free" : formatMoney(shippingFee, currency, symbol)}</span></div>
                <div className="flex justify-between text-muted"><span>Tax</span><span className="text-ink">{formatMoney(tax, currency, symbol)}</span></div>
                {codFee > 0 && <div className="flex justify-between text-muted"><span>COD fee</span><span className="text-ink">{formatMoney(codFee, currency, symbol)}</span></div>}
                <div className="flex justify-between border-t border-white/5 pt-2 font-mono text-base"><span className="text-ink">Total</span><span className="text-ink">{formatMoney(total, currency, symbol)}</span></div>
              </div>
              {anyEstimated && (
                <p className="mt-2 font-mono text-[10px] text-muted">Converted estimate — exact pricing shown at checkout.</p>
              )}

              {orderError && <p className="mt-3 font-mono text-[11px] text-accent2">{orderError}</p>}

              <button
                onClick={handlePlaceOrder}
                disabled={placing || items.length === 0}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {placing && <Loader2 size={16} className="animate-spin" />}
                {placing ? "Processing…" : paymentMethod === "cod" ? `Place Order · ${formatMoney(total, currency, symbol)}` : `Pay ${formatMoney(total, currency, symbol)}`}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}