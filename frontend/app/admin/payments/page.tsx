"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Banknote, CreditCard, Loader2, Smartphone } from "lucide-react";
import { fetchAllOrders } from "@/src/lib/adminOrders";
import { Order, PaymentMethodId } from "@/src/lib/orders";
import { formatPrice, cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const methodMeta: Record<PaymentMethodId, { label: string; icon: typeof CreditCard }> = {
  card: { label: "Card", icon: CreditCard },
  upi: { label: "UPI", icon: Smartphone },
  cod: { label: "Cash on Delivery", icon: Banknote },
};

const statusMeta: Record<string, string> = {
  paid: "text-accent bg-accent/10",
  pending: "text-muted bg-white/5",
  failed: "text-accent2 bg-accent2/10",
  refunded: "text-accent2 bg-accent2/10",
};

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={28} />
      </div>
    );
  }

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const byMethod = (["card", "upi", "cod"] as const).map((method) => {
    const matching = paidOrders.filter((o) => o.paymentMethod === method);
    const revenue = matching.reduce((sum, o) => sum + o.total, 0);
    return { method, count: matching.length, revenue, percent: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0 };
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Payments</h1>
      <p className="mt-1 font-body text-sm text-muted">Live transactions via Razorpay, plus Cash on Delivery.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {byMethod.map(({ method, count, revenue, percent }) => {
          const meta = methodMeta[method];
          const Icon = meta.icon;
          return (
            <div key={method} className="rounded-2xl border border-white/5 bg-surface p-5">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-accent" />
                <span className="font-body text-sm text-ink">{meta.label}</span>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-ink">{formatPrice(revenue)}</p>
              <p className="mt-1 font-body text-xs text-muted">{count} transaction{count !== 1 ? "s" : ""}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted">{percent}% of revenue</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/5 bg-surface">
        <div className="hidden grid-cols-[1fr_140px_100px_100px_120px] gap-4 border-b border-white/5 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted lg:grid">
          <span>Order</span><span>Method</span><span>Status</span><span>Amount</span><span>Date</span>
        </div>
        <div className="divide-y divide-white/5">
          {orders.map((o) => {
            const meta = methodMeta[o.paymentMethod];
            const Icon = meta.icon;
            return (
              <div key={o.id} className="flex flex-col gap-2 px-5 py-4 lg:grid lg:grid-cols-[1fr_140px_100px_100px_120px] lg:items-center lg:gap-4">
                <span className="font-mono text-sm text-ink">{o.id}</span>
                <span className="flex w-fit items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] text-ink">
                  <Icon size={11} /> {meta.label}
                </span>
                <span className={cn("w-fit rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest", statusMeta[o.paymentStatus])}>
                  {o.paymentStatus}
                </span>
                <span className="font-mono text-sm text-ink">{formatPrice(o.total)}</span>
                <span className="font-body text-xs text-muted">
                  {new Date(o.placedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            );
          })}
          {orders.length === 0 && <p className="px-5 py-10 text-center font-body text-sm text-muted">No transactions yet.</p>}
        </div>
      </div>
    </div>
  );
}