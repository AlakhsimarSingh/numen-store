"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Trash2, X, Zap } from "lucide-react";
import { fetchAllFlashDeals, createFlashDeal, updateFlashDeal, deleteFlashDeal, FlashDeal } from "@/src/lib/flashDeal";
import { fetchProducts } from "@/src/lib/products";
import { Product } from "@/src/types";
import { useToastStore } from "@/src/hooks/useToastStore";
import { formatPrice, cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isLive(deal: FlashDeal) {
  const now = Date.now();
  return deal.active && new Date(deal.startsAt).getTime() <= now && new Date(deal.endsAt).getTime() >= now;
}

export default function AdminFlashDealPage() {
  const [deals, setDeals] = useState<FlashDeal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const [productId, setProductId] = useState("");
  const [label, setLabel] = useState("Flash Deal");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  function load() {
    setLoading(true);
    Promise.all([fetchAllFlashDeals(), fetchProducts()])
      .then(([d, p]) => {
        setDeals(d);
        setProducts(p);
      })
      .catch(() => showToast("Failed to load flash deals.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [showToast]);

  function openAdd() {
    setProductId(products[0]?.id ?? "");
    setLabel("Flash Deal");
    const now = new Date();
    const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    setStartsAt(toDatetimeLocal(now.toISOString()));
    setEndsAt(toDatetimeLocal(inOneDay.toISOString()));
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !startsAt || !endsAt) return;
    setSaving(true);
    try {
      const created = await createFlashDeal({
        productId,
        label,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      setDeals((prev) => [created, ...prev]);
      showToast("Flash deal created");
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create flash deal.", "error");
    }
    setSaving(false);
  }

  async function handleToggleActive(deal: FlashDeal) {
    try {
      const updated = await updateFlashDeal(deal.id, { active: !deal.active });
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? updated : d)));
    } catch {
      showToast("Failed to update deal.", "error");
    }
  }

  async function handleDelete(deal: FlashDeal) {
    if (!confirm(`Delete flash deal for "${deal.product.name}"?`)) return;
    try {
      await deleteFlashDeal(deal.id);
      setDeals((prev) => prev.filter((d) => d.id !== deal.id));
      showToast("Flash deal deleted", "info");
    } catch {
      showToast("Failed to delete deal.", "error");
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Flash Deals</h1>
          <p className="mt-1 font-body text-sm text-muted">{deals.length} deal{deals.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openAdd}
          disabled={products.length === 0}
          className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          <Plus size={16} /> New Flash Deal
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {deals.map((deal) => {
          const live = isLive(deal);
          return (
            <div key={deal.id} className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-surface p-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", live ? "bg-accent/15 text-accent" : "bg-surface2 text-muted")}>
                  <Zap size={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-body text-sm text-ink">{deal.product.name}</p>
                  <p className="font-mono text-[11px] text-muted">
                    {deal.label} · {formatPrice(deal.product.price)} · {new Date(deal.startsAt).toLocaleString()} → {new Date(deal.endsAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest", live ? "bg-accent/15 text-accent" : "bg-surface2 text-muted")}>
                  {live ? "Live" : deal.active ? "Scheduled" : "Paused"}
                </span>
                <button
                  onClick={() => handleToggleActive(deal)}
                  className="rounded-full border border-white/10 px-3 py-1.5 font-body text-xs text-ink hover:border-accent/50"
                >
                  {deal.active ? "Pause" : "Activate"}
                </button>
                <button onClick={() => handleDelete(deal)} className="text-muted hover:text-accent2">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
        {deals.length === 0 && (
          <p className="rounded-2xl border border-white/5 bg-surface px-5 py-10 text-center font-body text-sm text-muted">
            No flash deals yet.
          </p>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4" onClick={() => setModalOpen(false)}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">New Flash Deal</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Product</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Label</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">Starts</label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">Ends</label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Creating…" : "Create Flash Deal"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}