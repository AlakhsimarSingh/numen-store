"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ChevronLeft, Loader2, Package, RotateCcw, Truck, XCircle } from "lucide-react";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { fetchOrder, Order, OrderStatus } from "@/src/lib/orders";
import { formatPrice, cn } from "@/src/lib/utils";
import ReturnRequestModal from "@/components/account/ReturnRequestModal";

const ease = [0.16, 1, 0.3, 1] as const;

const stages: { status: OrderStatus; label: string; icon: typeof Check }[] = [
  { status: "processing", label: "Processing", icon: Package },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: Check },
];

const stageIndex: Record<OrderStatus, number> = {
  processing: 0,
  shipped: 1,
  delivered: 2,
  cancelled: -1,
};

export default function OrderDetailPage() {
  const { ready } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  useEffect(() => {
    if (!ready || !params.id) return;
    let cancelled = false;

    setLoading(true);
    fetchOrder(params.id)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err) => {
        if (!cancelled && err instanceof Error && err.message === "NOT_FOUND") setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, params.id]);

  if (!ready || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={28} />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="font-body text-sm text-muted">We couldn&apos;t find that order.</p>
        <Link href="/account" className="mt-4 inline-block font-body text-sm text-accent hover:underline">
          Back to Account
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const currentStageIndex = stageIndex[order.status];
  const isDelivered = order.status === "delivered";
  const shipping = order.shipping;
  const returnRequest = order.returnRequest;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <button
        onClick={() => router.push("/account")}
        className="mb-6 flex items-center gap-1.5 font-body text-xs text-muted hover:text-ink"
      >
        <ChevronLeft size={14} /> Back to Account
      </button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-ink">{order.id}</p>
            <p className="font-body text-xs text-muted">
              Placed{" "}
              {new Date(order.placedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          {returnRequest ? (
            <span className="rounded-full bg-accent2/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent2">
              Return {returnRequest.status}
            </span>
          ) : (
            isDelivered && (
              <button
                onClick={() => setShowReturn(true)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 font-body text-xs text-ink hover:border-accent/50 hover:text-accent"
              >
                <RotateCcw size={13} /> Request Return
              </button>
            )
          )}
        </div>

        {/* Timeline */}
        {isCancelled ? (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-accent2/20 bg-accent2/5 p-6">
            <XCircle size={20} className="text-accent2" />
            <p className="font-body text-sm text-ink">This order was cancelled.</p>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-white/5 bg-surface p-6">
            <div className="flex items-center">
              {stages.map((s, i) => {
                const done = i <= currentStageIndex;
                const Icon = s.icon;
                return (
                  <div key={s.status} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border",
                          done ? "border-accent bg-accent text-bg" : "border-white/15 text-muted"
                        )}
                      >
                        <Icon size={14} />
                      </div>
                      <span className={cn("text-center font-body text-[11px]", done ? "text-ink" : "text-muted")}>
                        {s.label}
                      </span>
                    </div>
                    {i < stages.length - 1 && (
                      <div className="relative mx-1 -translate-y-3 h-px flex-1 bg-white/10">
                        <div
                          className="absolute inset-y-0 left-0 bg-accent transition-all duration-500"
                          style={{ width: i < currentStageIndex ? "100%" : "0%" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {returnRequest && (
          <div className="mt-4 rounded-2xl border border-accent2/20 bg-accent2/5 p-5">
            <p className="font-body text-xs text-muted">
              Return reason: <span className="text-ink">{returnRequest.reason}</span>
            </p>
            {returnRequest.comment && (
              <p className="mt-1 font-body text-xs text-muted">&ldquo;{returnRequest.comment}&rdquo;</p>
            )}
          </div>
        )}

        {/* Items */}
        <div className="mt-4 rounded-2xl border border-white/5 bg-surface p-5">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-surface2">
                  <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm text-ink">
                    {item.name}
                    {(item.color || item.size) && (
                      <span className="text-muted"> — {[item.color, item.size].filter(Boolean).join(" / ")}</span>
                    )}
                  </p>
                  <p className="font-mono text-xs text-muted">Qty {item.qty}</p>
                </div>
                <span className="font-mono text-sm text-ink">{formatPrice(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping + totals */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-surface p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-accent">Shipped to</p>
            <p className="mt-2 font-body text-sm text-ink">{shipping.fullName}</p>
            <p className="font-body text-sm text-muted">
              {shipping.addressLine1}, {shipping.city}, {shipping.state} {shipping.zip}
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface p-5">
            <div className="space-y-1.5 font-body text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="text-ink">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Shipping</span>
                <span className="text-ink">{order.shippingFee === 0 ? "Free" : formatPrice(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-1.5 font-mono">
                <span className="text-ink">Total</span>
                <span className="text-ink">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {showReturn && (
        <ReturnRequestModal
          orderId={order.id}
          onClose={() => setShowReturn(false)}
          onSuccess={(updated) => setOrder(updated)}
        />
      )}
    </div>
  );
}