"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2, Package } from "lucide-react";
import { fetchOrders, Order } from "@/src/lib/orders";
import { formatPrice, cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const statusLabel: Record<Order["status"], string> = {
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusStyle: Record<Order["status"], string> = {
  processing: "bg-accent/10 text-accent",
  shipped: "bg-accent/10 text-accent",
  delivered: "bg-accent/10 text-accent",
  cancelled: "bg-accent2/10 text-accent2",
};

export default function OrderHistorySection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-surface p-10 text-center">
        <Package size={24} className="mx-auto text-muted" />
        <p className="mt-3 font-body text-sm text-muted">No orders yet.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="space-y-4">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/account/orders/${order.id}`}
          className="block rounded-2xl border border-white/5 bg-surface p-5 transition-colors hover:border-accent/30"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-sm text-ink">{order.id}</p>
              <p className="font-body text-xs text-muted">
                {new Date(order.placedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <span className={cn("rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest", statusStyle[order.status])}>
              {statusLabel[order.status]}
            </span>
          </div>

          <div className="mt-4 flex -space-x-3">
            {order.items.slice(0, 5).map((item, i) => (
              <div key={`${item.productId}-${i}`} className="relative h-12 w-10 overflow-hidden rounded-lg border-2 border-surface bg-surface2">
                <Image src={item.image} alt={item.name} fill sizes="40px" className="object-cover" />
              </div>
            ))}
            {order.items.length > 5 && (
              <div className="flex h-12 w-10 items-center justify-center rounded-lg border-2 border-surface bg-surface2 font-mono text-[10px] text-muted">
                +{order.items.length - 5}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
            <span className="font-body text-xs text-muted">
              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
            </span>
            <span className="font-mono text-sm text-ink">{formatPrice(order.total)}</span>
          </div>
        </Link>
      ))}
    </motion.div>
  );
}