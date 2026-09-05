"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Store, Tag, Trash2, X } from "lucide-react";
import { useToastStore } from "@/src/hooks/useToastStore";
import { cn } from "@/src/lib/utils";
import { createPromoCode, deletePromoCode, fetchPromoCodes, PromoCode, updatePromoCode } from "@/src/lib/promoCodes";

const ease = [0.16, 1, 0.3, 1] as const;

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const emptyForm = {
  code: "",
  percent: "10",
  businessName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  description: "",
  publiclyListed: false,
};

export default function AdminPromotionsPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((s) => s.show);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
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
    const upperCode = form.code.trim().toUpperCase();
    if (!upperCode || !form.businessName.trim() || form.percent === "") return;
    if (promoCodes.some((p) => p.code === upperCode)) {
      showToast("That code already exists", "error");
      return;
    }
    setSaving(true);
    try {
      const created = await createPromoCode({
        code: upperCode,
        percent: parseFloat(form.percent),
        active: true,
        businessName: form.businessName.trim(),
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        description: form.description.trim() || undefined,
        publiclyListed: form.publiclyListed,
      });
      setPromoCodes((prev) => [created, ...prev]);
      showToast("Partner code created");
      setModalOpen(false);
      setForm(emptyForm);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create promo code", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(p: PromoCode) {
    const nextActive = !p.active;
    setPromoCodes((prev) => prev.map((x) => (x.code === p.code ? { ...x, active: nextActive } : x)));
    try {
      await updatePromoCode(p.code, { active: nextActive });
    } catch (err) {
      setPromoCodes((prev) => prev.map((x) => (x.code === p.code ? { ...x, active: p.active } : x)));
      showToast(err instanceof Error ? err.message : "Failed to update promo code", "error");
    }
  }

  async function handleTogglePublic(p: PromoCode) {
    const next = !p.publiclyListed;
    setPromoCodes((prev) => prev.map((x) => (x.code === p.code ? { ...x, publiclyListed: next } : x)));
    try {
      await updatePromoCode(p.code, { publiclyListed: next });
    } catch (err) {
      setPromoCodes((prev) => prev.map((x) => (x.code === p.code ? { ...x, publiclyListed: p.publiclyListed } : x)));
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
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Partners & Promotions</h1>
          <p className="mt-1 font-body text-sm text-muted">
            Every code is tied to a partner business — required at checkout, so every sale is attributable.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02]"
        >
          <Plus size={16} /> New Partner Code
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
            <p className="mt-2 flex items-center gap-1.5 font-body text-sm font-semibold text-ink">
              <Store size={13} className="text-muted" /> {p.businessName || "Unnamed partner"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{p.percent}% off</p>
            <p className="mt-1 font-body text-xs text-muted">
              Used {p.usageCount} time{p.usageCount !== 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 font-body text-xs text-muted">{formatINR(p.totalSubtotalINR)} in orders</p>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleToggleActive(p)}
                className={cn(
                  "flex-1 rounded-full py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
                  p.active ? "bg-accent/10 text-accent" : "bg-white/5 text-muted"
                )}
              >
                {p.active ? "Active" : "Inactive"}
              </button>
              <button
                onClick={() => handleTogglePublic(p)}
                className={cn(
                  "flex-1 rounded-full py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
                  p.publiclyListed ? "bg-accent/10 text-accent" : "bg-white/5 text-muted"
                )}
              >
                {p.publiclyListed ? "Public" : "Private"}
              </button>
            </div>
          </div>
        ))}
        {promoCodes.length === 0 && (
          <p className="col-span-full py-10 text-center font-body text-sm text-muted">No partner codes yet.</p>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4"
          onClick={() => setModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-white/10 bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">New Partner Code</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Code</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="ACME10"
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-mono text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Business name</label>
                <input
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Acme Retailers"
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Discount % (0 for attribution-only)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.percent}
                  onChange={(e) => setForm({ ...form, percent: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Description (shown to customers if public)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Streetwear boutique in Ludhiana"
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">Contact name</label>
                  <input
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">Contact phone</label>
                  <input
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Contact email</label>
                <input
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                />
              </div>
              <label className="flex items-center gap-2 font-body text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.publiclyListed}
                  onChange={(e) => setForm({ ...form, publiclyListed: e.target.checked })}
                  className="h-4 w-4 rounded border-white/10 bg-bg accent-[var(--color-accent)]"
                />
                List in the customer-facing &quot;connect with a seller&quot; picker
              </label>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
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