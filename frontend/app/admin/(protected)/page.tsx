"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  DollarSign,
  Package,
  ShoppingBag,
  Star,
  AlertTriangle,
  Loader2,
  Users,
  Tag,
  Zap,
  Activity,
  RotateCcw,
} from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import { useToastStore } from "@/src/hooks/useToastStore";
import { fetchAdminDashboard, DashboardData } from "@/src/lib/adminDashboard";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

// Revenue and order totals here are always the raw INR amounts recorded at
// checkout — independent of `formatPrice`'s site-wide display currency,
// which follows the customer-facing currency selector.
const formatBasePriceINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const statusLabels: Record<string, string> = {
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    let cancelled = false;
    fetchAdminDashboard()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) showToast(err instanceof Error ? err.message : "Failed to load dashboard", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  const nothingUrgent = data.outOfStock.count === 0 && data.lowStock.count === 0 && data.pendingReturnsCount === 0;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Dashboard</h1>
        <p className="mt-1 font-body text-sm text-muted">Everything happening on NUMEN, at a glance.</p>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatBasePriceINR(data.revenue)} icon={DollarSign} />
        <StatCard label="Orders" value={String(data.ordersCount)} icon={Package} />
        <StatCard label="Products" value={String(data.productsCount)} icon={ShoppingBag} />
        <StatCard
          label="Avg. Rating"
          value={data.avgRating != null ? `${data.avgRating} (${data.reviewsCount})` : "—"}
          icon={Star}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="New Customers (7d)" value={String(data.newCustomersCount)} icon={Users} />
        <StatCard label="Active Promo Codes" value={String(data.activePromoCount)} icon={Tag} />
        <StatCard label="Active Flash Deals" value={String(data.activeFlashDealsCount)} icon={Zap} />
        <StatCard
          label="Pending Returns"
          value={String(data.pendingReturnsCount)}
          icon={RotateCcw}
          accentColor={data.pendingReturnsCount > 0 ? "accent2" : "accent"}
        />
      </div>

      {/* Order status breakdown */}
      <div className="mt-6 rounded-2xl border border-white/5 bg-surface p-5">
        <h2 className="mb-4 font-display text-base font-bold text-ink">Order Status</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(statusLabels) as (keyof typeof statusLabels)[]).map((key) => (
            <div key={key} className="rounded-xl bg-bg px-4 py-3">
              <p className="font-display text-xl font-bold text-ink">{data.ordersByStatus[key as keyof typeof data.ordersByStatus]}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">{statusLabels[key]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-ink">Recent Orders</h2>
            <Link href="/admin/orders" className="font-body text-xs text-accent hover:underline">View all</Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="py-6 text-center font-body text-sm text-muted">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-mono text-xs text-ink">{o.id}</p>
                    <p className="font-body text-[11px] text-muted">
                      {o.itemsCount} item{o.itemsCount !== 1 ? "s" : ""} · {statusLabels[o.status]}
                    </p>
                  </div>
                  <span className="font-mono text-sm text-ink">{formatBasePriceINR(o.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={15} className="text-accent" />
            <h2 className="font-display text-base font-bold text-ink">Recent Admin Activity</h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="py-6 text-center font-body text-sm text-muted">No activity logged yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-body text-xs text-ink">{a.action}</p>
                    <p className="font-mono text-[10px] text-muted">{a.email}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-[10px] uppercase tracking-widest",
                      a.success ? "text-accent" : "text-accent2"
                    )}
                  >
                    {a.success ? "OK" : "Failed"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Needs attention — with actual product-level detail, not just counts */}
      <div className="mt-6 rounded-2xl border border-white/5 bg-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={15} className="text-accent2" />
          <h2 className="font-display text-base font-bold text-ink">Needs Attention</h2>
        </div>

        {nothingUrgent ? (
          <p className="py-4 text-center font-body text-xs text-muted">All clear — nothing urgent.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {data.outOfStock.count > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-body text-xs font-medium text-ink">Out of stock</span>
                  <Link href="/admin/products" className="font-mono text-[10px] text-accent2 hover:underline">
                    {data.outOfStock.count} total — view all
                  </Link>
                </div>
                <div className="space-y-2">
                  {data.outOfStock.products.map((p) => (
                    <Link
                      key={p.id}
                      href="/admin/products"
                      className="flex items-center gap-3 rounded-xl bg-bg px-3 py-2 hover:bg-surface2"
                    >
                      <div className="relative h-10 w-9 shrink-0 overflow-hidden rounded-md bg-surface2">
                        <Image src={p.image} alt={p.name} fill sizes="36px" className="object-cover" />
                      </div>
                      <span className="truncate font-body text-xs text-ink">{p.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-accent2">0 left</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {data.lowStock.count > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-body text-xs font-medium text-ink">Low stock</span>
                  <Link href="/admin/products" className="font-mono text-[10px] text-accent hover:underline">
                    {data.lowStock.count} total — view all
                  </Link>
                </div>
                <div className="space-y-2">
                  {data.lowStock.products.map((p) => (
                    <Link
                      key={p.id}
                      href="/admin/products"
                      className="flex items-center gap-3 rounded-xl bg-bg px-3 py-2 hover:bg-surface2"
                    >
                      <div className="relative h-10 w-9 shrink-0 overflow-hidden rounded-md bg-surface2">
                        <Image src={p.image} alt={p.name} fill sizes="36px" className="object-cover" />
                      </div>
                      <span className="truncate font-body text-xs text-ink">{p.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-accent">{p.stock} left</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {data.pendingReturnsCount > 0 && (
              <Link
                href="/admin/orders"
                className="flex items-center justify-between rounded-xl bg-bg px-4 py-3 hover:bg-surface2 lg:col-span-2"
              >
                <span className="font-body text-xs text-ink">Pending return requests</span>
                <span className="font-mono text-xs text-accent2">{data.pendingReturnsCount}</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}