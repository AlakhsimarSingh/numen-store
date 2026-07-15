"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Loader2, Plus, Smartphone, Star, Trash2, X } from "lucide-react";
import {
  SavedPaymentMethod,
  fetchPaymentMethods,
  createPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from "@/src/lib/paymentMethods";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

export default function PaymentMethodsSection() {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"card" | "upi">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [vpa, setVpa] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPaymentMethods()
      .then(setMethods)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const label = type === "card" ? `•••• ${cardNumber.replace(/\D/g, "").slice(-4).padStart(4, "•")}` : vpa;
    if (type === "card" && cardNumber.replace(/\D/g, "").length < 12) return;
    if (type === "upi" && !vpa.includes("@")) return;

    setSaving(true);
    try {
      const created = await createPaymentMethod({ type, label });
      setMethods((prev) => [created, ...prev.map((m) => (created.isDefault ? { ...m, isDefault: false } : m))]);
      setShowForm(false);
      setCardNumber("");
      setVpa("");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    const updated = await setDefaultPaymentMethod(id);
    setMethods((prev) => prev.map((m) => (m.id === id ? updated : { ...m, isDefault: false })));
  }

  async function handleDelete(id: string) {
    await deletePaymentMethod(id);
    setMethods((prev) => prev.filter((m) => m.id !== id));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="space-y-4">
      {methods.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-surface p-8 text-center">
          <CreditCard size={24} className="mx-auto text-muted" />
          <p className="mt-3 font-body text-sm text-muted">No saved payment methods yet.</p>
        </div>
      )}

      {methods.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface2 text-ink">
              {m.type === "card" ? <CreditCard size={16} /> : <Smartphone size={16} />}
            </div>
            <div>
              <p className="font-mono text-sm text-ink">{m.label}</p>
              {m.isDefault && (
                <span className="mt-0.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                  <Star size={9} fill="currentColor" /> Default
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!m.isDefault && (
              <button onClick={() => handleSetDefault(m.id)} className="font-body text-xs text-muted hover:text-accent">
                Set default
              </button>
            )}
            <button onClick={() => handleDelete(m.id)} className="text-muted hover:text-accent2">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}

      {showForm ? (
        <div className="rounded-2xl border border-white/5 bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink">New payment method</h3>
            <button onClick={() => setShowForm(false)} className="text-muted hover:text-ink">
              <X size={18} />
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            {(["card", "upi"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 rounded-xl border px-4 py-2.5 font-body text-sm capitalize transition-colors",
                  type === t ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted"
                )}
              >
                {t === "card" ? "Card" : "UPI"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {type === "card" ? (
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
                className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-mono text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
              />
            ) : (
              <input
                value={vpa}
                onChange={(e) => setVpa(e.target.value)}
                placeholder="yourname@bank"
                className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
              />
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-4 font-body text-sm text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          <Plus size={16} /> Add payment method
        </button>
      )}
    </motion.div>
  );
}