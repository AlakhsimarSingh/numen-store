"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Tag, Trash2, X } from "lucide-react";
import { useToastStore } from "@/src/hooks/useToastStore";
import { cn } from "@/src/lib/utils";
import { createPromoCode, deletePromoCode, fetchPromoCodes, PromoCode, updatePromoCode } from "@/src/lib/promoCodes";

const ease = [0.16, 1, 0.3, 1] as const;

export default function AdminPromotionsPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((s) => s.show);

  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPromoCodes()
      .then((data) => {
        if (!cancelled) setPromoCodes(data);
      })
      .catch((err) => {
        if (!cancelled) showToast(err instanceof Error ? err.message : "Failed to load promo codes", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !percent) return;
    const upperCode = code.trim().toUpperCase();
    if (promoCodes.some((p) => p.code === upperCode)) {
      showToast("That code already exists", "error");
      return;
    }
    setSaving(true);
    try {
      const created = await createPromoCode({ code: upperCode, percent: parseFloat(percent), active: true });
      setPromoCodes((prev) => [created, ...prev]);
      showToast("Promo code created");
      setModalOpen(false);
      setCode("");
      setPercent("10");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create promo code", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(p: PromoCode) {
    // Optimistic update — instant feedback, rolled back if the request fails.
    const nextActive = !p.active;
    setPromoCodes((prev) => prev.map((x) => (x.code === p.code ? { ...x, active: nextActive } : x)));
    try {
      await updatePromoCode(p.code, { active: nextActive });
    } catch (err) {
      setPromoCodes((prev) => prev.map((x) => (x.code === p.code ? { ...x, active: p.active } : x)));
      showToast(err instanceof Error ? err.message : "Failed to update promo code", "error");
    }
  }

  async function handleDelete(codeToDelete: string) {
    if (!confirm(`Delete promo code "${codeToDelete}"?`)) return;
    try {
      await deletePromoCode(codeToDelete);
      setPromoCodes((prev) => prev.filter((p) => p.code !== codeToDelete));
      showToast("Promo code deleted", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete promo code", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Promotions</h1>
          <p className="mt-1 font-body text-sm text-muted">Codes customers can use at checkout — live immediately on the storefront.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02]">
          <Plus size={16} /> New Code
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {promoCodes.map((p) => (
          <div key={p.code} className="rounded-2xl border border-white/5 bg-surface p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag size={15} className="text-accent" />
                <span className="font-mono text-sm text-ink">{p.code}</span>
              </div>
              <button onClick={() => handleDelete(p.code)} className="text-muted hover:text-accent2">
                <Trash2 size={14} />
              </button>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-ink">{p.percent}% off</p>
            <button
              onClick={() => handleToggleActive(p)}
              className={cn(
                "mt-3 w-full rounded-full py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
                p.active ? "bg-accent/10 text-accent" : "bg-white/5 text-muted"
              )}
            >
              {p.active ? "Active" : "Inactive"} — tap to toggle
            </button>
          </div>
        ))}
        {promoCodes.length === 0 && (
          <p className="col-span-full py-10 text-center font-body text-sm text-muted">No promo codes yet.</p>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4" onClick={() => setModalOpen(false)}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">New Promo Code</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Code</label>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER20"
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-mono text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Discount %</label>
                <input type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50" />
              </div>
              <button type="submit" disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:opacity-70">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Creating…" : "Create Code"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}