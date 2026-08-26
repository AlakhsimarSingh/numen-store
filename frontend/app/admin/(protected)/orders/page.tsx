"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, ExternalLink, Loader2, Package, RotateCcw, Truck, X } from "lucide-react";
import { fetchAllOrders, updateOrderStatusAdmin, updateReturnDecision, AdminOrder } from "@/src/lib/adminOrders";
import { OrderStatus, PaymentStatus } from "@/src/lib/orders";
import { useToastStore } from "@/src/hooks/useToastStore";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

// Formats an amount in whatever currency the order was actually charged
// in — Order.total/subtotal/etc. are stored in the charged currency, not
// always INR, so a single hardcoded INR formatter would mislabel foreign-
// currency orders. Falls back to a plain "CODE amount" string if the
// Intl formatter doesn't recognize the currency code for some reason.
const formatAmount = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const statusColors: Record<OrderStatus, string> = {
  processing: "text-accent bg-accent/10",
  shipped: "text-accent bg-accent/10",
  delivered: "text-accent bg-accent/10",
  cancelled: "text-accent2 bg-accent2/10",
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  pending: "text-muted",
  paid: "text-accent",
  failed: "text-accent2",
  refunded: "text-accent2",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    fetchAllOrders()
      .then(setOrders)
      .catch(() => showToast("Failed to load orders.", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    try {
      const updated = await updateOrderStatusAdmin(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setSelected((prev) => (prev && prev.id === orderId ? updated : prev));
      showToast(`Order marked as ${status}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update order.", "error");
    }
  }

  async function handleReturnDecision(orderId: string, decision: "approved" | "rejected") {
    try {
      const updated = await updateReturnDecision(orderId, decision);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setSelected((prev) => (prev && prev.id === orderId ? updated : prev));
      showToast(`Return ${decision}`, decision === "approved" ? "success" : "error");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update return.", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={28} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Orders</h1>
      <p className="mt-1 font-body text-sm text-muted">
        {orders.length} order{orders.length !== 1 ? "s" : ""} placed
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-surface">
        <div className="hidden grid-cols-[1fr_1fr_100px_120px_110px_100px] gap-4 border-b border-white/5 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted lg:grid">
          <span>Order</span>
          <span>Customer</span>
          <span>Date</span>
          <span>Total</span>
          <span>Status</span>
          <span>Return</span>
        </div>
        <div className="divide-y divide-white/5">
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o)}
              className="flex w-full flex-col gap-2.5 px-5 py-4 text-left transition-colors hover:bg-surface2 lg:grid lg:grid-cols-[1fr_1fr_100px_120px_110px_100px] lg:items-center lg:gap-4"
            >
              <div>
                <p className="font-mono text-sm text-ink">{o.id}</p>
                <p className="font-body text-[11px] text-muted">{o.items.length} item{o.items.length !== 1 ? "s" : ""}</p>
              </div>

              <div className="min-w-0">
                <p className="truncate font-body text-sm text-ink">{o.customer?.name || "Unnamed customer"}</p>
                <p className="truncate font-body text-[11px] text-muted">{o.customer?.email || "—"}</p>
              </div>

              <span className="font-body text-xs text-muted">
                {new Date(o.placedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>

              <div>
                <span className="block font-mono text-sm text-ink">{formatAmount(o.total, o.currency)}</span>
                <span className={cn("font-mono text-[9px] uppercase tracking-widest", paymentStatusColors[o.paymentStatus])}>
                  {o.paymentStatus}
                </span>
              </div>

              <span className={cn("w-fit rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest", statusColors[o.status])}>
                {o.status}
              </span>

              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {o.returnRequest ? o.returnRequest.status : "—"}
              </span>
            </button>
          ))}
          {orders.length === 0 && (
            <p className="px-5 py-10 text-center font-body text-sm text-muted">No orders yet.</p>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4" onClick={() => setSelected(null)}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-surface p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-mono text-sm text-ink">{selected.id}</h3>
                <p className="mt-0.5 font-body text-xs text-muted">
                  Placed{" "}
                  {new Date(selected.placedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="shrink-0 text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {/* Fulfillment status */}
            <div className="mt-4 flex flex-wrap gap-2">
              {(["processing", "shipped", "delivered", "cancelled"] as OrderStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(selected.id, status)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-body text-xs capitalize transition-colors",
                    selected.status === status ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-ink"
                  )}
                >
                  {status === "shipped" && <Truck size={12} />}
                  {status === "delivered" && <Check size={12} />}
                  {status === "processing" && <Package size={12} />}
                  {status}
                </button>
              ))}
            </div>

            {/* Return */}
            {selected.returnRequest && (
              <div className="mt-4 rounded-xl border border-accent2/20 bg-accent2/5 p-4">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-accent2">
                  <RotateCcw size={11} /> Return {selected.returnRequest.status}
                </div>
                <p className="mt-2 font-body text-xs text-ink">{selected.returnRequest.reason}</p>
                {selected.returnRequest.comment && (
                  <p className="mt-1 font-body text-xs text-muted">&ldquo;{selected.returnRequest.comment}&rdquo;</p>
                )}
                {selected.returnRequest.status === "requested" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleReturnDecision(selected.id, "approved")}
                      className="rounded-full bg-accent px-4 py-1.5 font-body text-xs font-semibold text-bg"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReturnDecision(selected.id, "rejected")}
                      className="rounded-full border border-white/10 px-4 py-1.5 font-body text-xs text-ink"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Customer */}
            <div className="mt-4 rounded-xl border border-white/5 bg-bg p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Customer</p>
              <p className="mt-1.5 font-body text-sm text-ink">{selected.customer?.name || "Unnamed customer"}</p>
              <p className="break-all font-body text-sm text-muted">{selected.customer?.email || "Unknown"}</p>
              {selected.customer?.phone && <p className="font-body text-sm text-muted">{selected.customer?.phone}</p>}
            </div>

            {/* Payment + Shipping */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-bg p-4">
                <p className="font-mono text-xs uppercase tracking-widest text-accent">Payment</p>
                <div className="mt-1.5 space-y-1 font-body text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Method</span>
                    <span className="uppercase text-ink">{selected.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Status</span>
                    <span className={cn("font-mono text-[10px] uppercase tracking-widest", paymentStatusColors[selected.paymentStatus])}>
                      {selected.paymentStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Currency</span>
                    <span className="text-ink">{selected.currency}</span>
                  </div>
                  {selected.promoCode && (
                    <div className="flex justify-between">
                      <span className="text-muted">Promo code</span>
                      <span className="font-mono text-ink">{selected.promoCode}</span>
                    </div>
                  )}
                </div>
                {(selected.razorpayOrderId || selected.razorpayPaymentId) && (
                  <div className="mt-3 space-y-1 border-t border-white/5 pt-2 font-mono text-[10px] text-muted">
                    {selected.razorpayOrderId && <p className="break-all">Order ref: {selected.razorpayOrderId}</p>}
                    {selected.razorpayPaymentId && <p className="break-all">Payment ref: {selected.razorpayPaymentId}</p>}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/5 bg-bg p-4">
                <p className="font-mono text-xs uppercase tracking-widest text-accent">Shipping to</p>
                <div className="mt-1.5 font-body text-sm">
                  <p className="text-ink">{selected.shipping?.fullName || "—"}</p>
                  <p className="text-muted">{selected.shipping?.phone || "—"}</p>
                  <p className="mt-1 text-muted">
                    {selected.shipping?.addressLine1}
                    {selected.shipping?.addressLine2 ? `, ${selected.shipping.addressLine2}` : ""}
                    {selected.shipping?.city ? `, ${selected.shipping.city}` : ""}
                    {selected.shipping?.state ? `, ${selected.shipping.state}` : ""} {selected.shipping?.zip}
                  </p>
                  <p className="text-muted">{selected.shipping?.country}</p>
                  {selected.shipping?.lat != null && selected.shipping?.lng != null && (
                    <a
                      href={`https://www.google.com/maps?q=${selected.shipping.lat},${selected.shipping.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline"
                    >
                      View on map <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mt-4 rounded-xl border border-white/5 bg-bg p-4">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
                {selected.items.length} item{selected.items.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-3">
                {selected.items.map((item, i) => (
                  <div key={`${item.productId}-${i}`} className="flex items-center gap-3">
                    <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-surface2">
                      <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm text-ink">{item.name}</p>
                      <p className="font-mono text-xs text-muted">
                        Qty {item.qty}
                        {(item.color || item.size) && ` · ${[item.color, item.size].filter(Boolean).join(" / ")}`}
                      </p>
                    </div>
                    <span className="font-mono text-sm text-ink">{formatAmount(item.price * item.qty, selected.currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-1.5 rounded-xl border border-white/5 bg-bg p-4 font-body text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="text-ink">{formatAmount(selected.subtotal, selected.currency)}</span>
              </div>
              {selected.discount > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Discount</span>
                  <span className="text-accent">-{formatAmount(selected.discount, selected.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <span>Shipping</span>
                <span className="text-ink">{selected.shippingFee === 0 ? "Free" : formatAmount(selected.shippingFee, selected.currency)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Tax</span>
                <span className="text-ink">{formatAmount(selected.tax, selected.currency)}</span>
              </div>
              {selected.codFee > 0 && (
                <div className="flex justify-between text-muted">
                  <span>COD fee</span>
                  <span className="text-ink">{formatAmount(selected.codFee, selected.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/5 pt-1.5 font-mono">
                <span className="text-ink">Total</span>
                <span className="text-ink">{formatAmount(selected.total, selected.currency)}</span>
              </div>
              {selected.currency !== "INR" && (
                <p className="pt-1 font-mono text-[10px] text-muted">≈ {formatINR(selected.totalBaseINR)} at base rate</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}