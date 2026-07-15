"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Loader2, Package, RotateCcw, Truck, X } from "lucide-react";
import { fetchAllOrders, updateOrderStatusAdmin, updateReturnDecision } from "@/src/lib/adminOrders";
import { Order, OrderStatus } from "@/src/lib/orders";
import { useToastStore } from "@/src/hooks/useToastStore";
import { formatPrice, cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const statusColors: Record<OrderStatus, string> = {
  processing: "text-accent bg-accent/10",
  shipped: "text-accent bg-accent/10",
  delivered: "text-accent bg-accent/10",
  cancelled: "text-accent2 bg-accent2/10",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
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
        <div className="hidden grid-cols-[1fr_120px_100px_120px_120px] gap-4 border-b border-white/5 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted lg:grid">
          <span>Order</span>
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
              className="flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-surface2 lg:grid lg:grid-cols-[1fr_120px_100px_120px_120px] lg:items-center lg:gap-4"
            >
              <div>
                <p className="font-mono text-sm text-ink">{o.id}</p>
                <p className="font-body text-[11px] text-muted">{o.items.length} items</p>
              </div>
              <span className="font-body text-xs text-muted">
                {new Date(o.placedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
              <span className="font-mono text-sm text-ink">{formatPrice(o.total)}</span>
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
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm text-ink">{selected.id}</h3>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>

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
                    <button onClick={() => handleReturnDecision(selected.id, "approved")}
                      className="rounded-full bg-accent px-4 py-1.5 font-body text-xs font-semibold text-bg">Approve</button>
                    <button onClick={() => handleReturnDecision(selected.id, "rejected")}
                      className="rounded-full border border-white/10 px-4 py-1.5 font-body text-xs text-ink">Reject</button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {selected.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-surface2">
                    <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm text-ink">{item.name}</p>
                    <p className="font-mono text-xs text-muted">Qty {item.qty}</p>
                  </div>
                  <span className="font-mono text-sm text-ink">{formatPrice(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/5 bg-bg p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Shipping</p>
              <p className="mt-1.5 font-body text-sm text-ink">{selected.shipping.fullName} · {selected.shipping.phone}</p>
              <p className="font-body text-sm text-muted">
                {selected.shipping.addressLine1}, {selected.shipping.city}, {selected.shipping.state} {selected.shipping.zip}
              </p>
            </div>

            <div className="mt-4 flex justify-between border-t border-white/5 pt-4 font-mono text-sm">
              <span className="text-muted">Total</span>
              <span className="text-ink">{formatPrice(selected.total)}</span>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}