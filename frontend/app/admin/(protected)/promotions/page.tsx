"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { BarChart3, Loader2, Mail, Pencil, Phone, Plus, Store, Tag, Trash2, User, X } from "lucide-react";
import { useToastStore } from "@/src/hooks/useToastStore";
import { cn } from "@/src/lib/utils";
import { createPromoCode, deletePromoCode, fetchPromoCodes, fetchSignatureAnalytics, PromoCode, RepresentativeSignatureAnalytics, updatePromoCode } from "@/src/lib/promoCodes";

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

// Same shape as emptyForm minus `code` — editing never touches the code
// itself, it's the primary key and orders are already attributed against
// it, so changing it here would silently break that attribution.
const emptyEditForm = {
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
  const [analytics, setAnalytics] = useState<RepresentativeSignatureAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPromoCodes()
      .then((data) => {
        if (!cancelled) setPromoCodes(data);
      })
      .catch((err) => {
        if (!cancelled) showToast(err instanceof Error ? err.message : "Failed to load representative signatures", "error");
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
      showToast("Representative signature created");
      setModalOpen(false);
      setForm(emptyForm);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create representative signature", "error");
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
      showToast(err instanceof Error ? err.message : "Failed to update representative signature", "error");
    }
  }

  async function handleTogglePublic(p: PromoCode) {
    const next = !p.publiclyListed;
    setPromoCodes((prev) => prev.map((x) => (x.code === p.code ? { ...x, publiclyListed: next } : x)));
    try {
      await updatePromoCode(p.code, { publiclyListed: next });
    } catch (err) {
      setPromoCodes((prev) => prev.map((x) => (x.code === p.code ? { ...x, publiclyListed: p.publiclyListed } : x)));
      showToast(err instanceof Error ? err.message : "Failed to update representative signature", "error");
    }
  }

  async function handleDelete(codeToDelete: string) {
    if (!confirm(`Delete representative signature "${codeToDelete}"?`)) return;
    try {
      await deletePromoCode(codeToDelete);
      setPromoCodes((prev) => prev.filter((p) => p.code !== codeToDelete));
      showToast("Representative signature deleted", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete representative signature", "error");
    }
  }

  async function openAnalytics(code: string) {
    setAnalyticsLoading(true);
    try {
      setAnalytics(await fetchSignatureAnalytics(code));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load signature performance.", "error");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  function openEdit(p: PromoCode) {
    setEditing(p);
    setEditForm({
      percent: String(p.percent),
      businessName: p.businessName ?? "",
      contactName: p.contactName ?? "",
      contactEmail: p.contactEmail ?? "",
      contactPhone: p.contactPhone ?? "",
      description: p.description ?? "",
      publiclyListed: p.publiclyListed,
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.businessName.trim() || editForm.percent === "") return;

    const percent = parseFloat(editForm.percent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      showToast("Percent must be between 0 and 100", "error");
      return;
    }

    setEditSaving(true);
    try {
      const updated = await updatePromoCode(editing.code, {
        percent,
        businessName: editForm.businessName.trim(),
        contactName: editForm.contactName.trim() || null,
        contactEmail: editForm.contactEmail.trim() || null,
        contactPhone: editForm.contactPhone.trim() || null,
        description: editForm.description.trim() || null,
        publiclyListed: editForm.publiclyListed,
      });
      setPromoCodes((prev) => prev.map((x) => (x.code === editing.code ? { ...x, ...updated } : x)));
      showToast("Representative signature updated");
      setEditing(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update representative signature", "error");
    } finally {
      setEditSaving(false);
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
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Representative Signatures</h1>
          <p className="mt-1 font-body text-sm text-muted">
            Each signature connects a representative business to its attributed sales and any customer discount.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02]"
        >
          <Plus size={16} /> New Representative Signature
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
              <div className="flex items-center gap-3">
                <button onClick={() => openEdit(p)} aria-label="Edit representative signature" className="text-muted hover:text-accent">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(p.code)} aria-label="Delete representative signature" className="text-muted hover:text-accent2">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="mt-2 flex items-center gap-1.5 font-body text-sm font-semibold text-ink">
              <Store size={13} className="text-muted" /> {p.businessName || "Unnamed partner"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{p.percent}% off</p>
            {p.description && <p className="mt-1.5 font-body text-xs text-muted">{p.description}</p>}

            {/* Contact details — previously collected in the create form
                but never surfaced back on the card, so there was no way to
                see who to reach out to without going into the database. */}
            {(p.contactName || p.contactEmail || p.contactPhone) && (
              <div className="mt-3 space-y-1 border-t border-white/5 pt-3">
                {p.contactName && (
                  <p className="flex items-center gap-1.5 font-body text-xs text-muted">
                    <User size={12} className="shrink-0 text-muted" /> {p.contactName}
                  </p>
                )}
                {p.contactEmail && (
                  <p className="flex items-center gap-1.5 font-body text-xs text-muted">
                    <Mail size={12} className="shrink-0 text-muted" />
                    <span className="truncate">{p.contactEmail}</span>
                  </p>
                )}
                {p.contactPhone && (
                  <p className="flex items-center gap-1.5 font-body text-xs text-muted">
                    <Phone size={12} className="shrink-0 text-muted" /> {p.contactPhone}
                  </p>
                )}
              </div>
            )}

            <p className="mt-3 font-body text-xs text-muted">
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
            <button
              type="button"
              onClick={() => openAnalytics(p.code)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-accent/30 py-2 font-body text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
            >
              <BarChart3 size={14} /> View performance
            </button>
          </div>
        ))}
        {promoCodes.length === 0 && (
          <p className="col-span-full py-10 text-center font-body text-sm text-muted">No representative signatures yet.</p>
        )}
      </div>

      {(analytics || analyticsLoading) && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-bg/80 px-4 backdrop-blur-sm" onClick={() => !analyticsLoading && setAnalytics(null)}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-surface p-5 sm:p-7"
          >
            {analyticsLoading && !analytics ? (
              <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-muted" size={26} /></div>
            ) : analytics ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-accent">Signature performance</p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-ink">{analytics.code}</h2>
                    <p className="mt-1 font-body text-sm text-muted">{analytics.businessName}</p>
                  </div>
                  <button onClick={() => setAnalytics(null)} className="text-muted hover:text-ink" aria-label="Close performance details"><X size={19} /></button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/5 bg-bg p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted">Attributed orders</p><p className="mt-2 font-display text-2xl font-bold text-ink">{analytics.orderCount}</p><p className="mt-1 font-body text-xs text-muted">{analytics.paidOrderCount} paid</p></div>
                  <div className="rounded-xl border border-white/5 bg-bg p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted">Paid revenue</p><p className="mt-2 font-display text-2xl font-bold text-accent">{formatINR(analytics.paidRevenueINR)}</p><p className="mt-1 font-body text-xs text-muted">subtotal in INR</p></div>
                  <div className="rounded-xl border border-white/5 bg-bg p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted">Units sold</p><p className="mt-2 font-display text-2xl font-bold text-ink">{analytics.paidUnits}</p><p className="mt-1 font-body text-xs text-muted">across paid orders</p></div>
                  <div className="rounded-xl border border-white/5 bg-bg p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted">Conversion signal</p><p className="mt-2 font-display text-2xl font-bold text-ink">{analytics.orderCount ? `${Math.round((analytics.paidOrderCount / analytics.orderCount) * 100)}%` : "—"}</p><p className="mt-1 font-body text-xs text-muted">paid / attributed</p></div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
                  <div className="rounded-xl border border-white/5 bg-bg p-4">
                    <p className="font-mono text-xs uppercase tracking-widest text-accent">All products sold · sorted by units</p>
                    <div className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                      {analytics.topProducts.map((product) => (
                        <div key={`${product.productId}-${product.name}`} className="flex items-center gap-3">
                          <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-surface2"><Image src={product.image} alt="" fill sizes="40px" className="object-cover" /></div>
                          <div className="min-w-0 flex-1"><p className="truncate font-body text-sm text-ink">{product.name}</p><p className="font-body text-xs text-muted">{product.units} unit{product.units !== 1 ? "s" : ""}</p></div>
                          <span className="shrink-0 font-mono text-xs text-accent">{formatINR(product.revenueINR)}</span>
                        </div>
                      ))}
                      {analytics.topProducts.length === 0 && <p className="py-6 text-center font-body text-sm text-muted">No paid product sales yet.</p>}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-bg p-4">
                    <p className="font-mono text-xs uppercase tracking-widest text-accent">Order status</p>
                    <div className="mt-3 space-y-2">
                      {Object.entries(analytics.statusCounts).map(([status, count]) => <div key={status} className="flex justify-between font-body text-sm"><span className="capitalize text-muted">{status.toLowerCase()}</span><span className="font-mono text-ink">{count}</span></div>)}
                    </div>
                    <p className="mt-6 font-mono text-xs uppercase tracking-widest text-accent">All attributed orders</p>
                    <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">
                      {analytics.recentOrders.map((order) => <div key={order.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 font-body text-xs"><span className="truncate text-muted">{order.id.slice(-8)} · {new Date(order.placedAt).toLocaleDateString()}</span><span className="shrink-0 font-mono text-ink">{formatINR(order.subtotalBaseINR)}</span></div>)}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        </div>
      )}

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
              <h3 className="font-display text-lg font-bold text-ink">New Representative Signature</h3>
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
                {saving ? "Creating…" : "Create Signature"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4"
          onClick={() => setEditing(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-white/10 bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">Edit Representative Signature</h3>
              <button onClick={() => setEditing(null)} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Code</label>
                <input
                  value={editing.code}
                  disabled
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-mono text-sm text-muted opacity-60"
                />
                <p className="mt-1 font-body text-[11px] text-muted">
                  Code can&apos;t be changed — orders are already attributed against it. Delete and recreate if it
                  truly needs to change.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Business name</label>
                <input
                  value={editForm.businessName}
                  onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
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
                  value={editForm.percent}
                  onChange={(e) => setEditForm({ ...editForm, percent: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Description (shown to customers if public)</label>
                <input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Streetwear boutique in Ludhiana"
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">Contact name</label>
                  <input
                    value={editForm.contactName}
                    onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">Contact phone</label>
                  <input
                    value={editForm.contactPhone}
                    onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Contact email</label>
                <input
                  value={editForm.contactEmail}
                  onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                />
              </div>
              <label className="flex items-center gap-2 font-body text-sm text-ink">
                <input
                  type="checkbox"
                  checked={editForm.publiclyListed}
                  onChange={(e) => setEditForm({ ...editForm, publiclyListed: e.target.checked })}
                  className="h-4 w-4 rounded border-white/10 bg-bg accent-[var(--color-accent)]"
                />
                List in the customer-facing &quot;connect with a seller&quot; picker
              </label>

              <button
                type="submit"
                disabled={editSaving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                {editSaving && <Loader2 size={16} className="animate-spin" />}
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}