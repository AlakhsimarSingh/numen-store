"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useSiteSettingsStore } from "@/src/hooks/useSiteSettingsStore";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { useToastStore } from "@/src/hooks/useToastStore";
import { cn } from "@/src/lib/utils";
import { updateSiteSettings } from "@/src/lib/site-settings";

export default function AdminSettingsPage() {
  const settings = useSiteSettingsStore();
  const currencies = useCurrencyStore((s) => s.currencies);
  const rates = useCurrencyStore((s) => s.rates);
  const loadRates = useCurrencyStore((s) => s.loadRates);
  const addCurrency = useCurrencyStore((s) => s.addCurrency);
  const setRate = useCurrencyStore((s) => s.setRate);
  const removeCurrency = useCurrencyStore((s) => s.removeCurrency);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const [newCode, setNewCode] = useState("");
  const [newRate, setNewRate] = useState("");
  const [addingCurrency, setAddingCurrency] = useState(false);
  const [savingCode, setSavingCode] = useState<string | null>(null);

  const [form, setForm] = useState({
    siteName: settings.siteName,
    tagline: settings.tagline,
    heroLine1: settings.heroHeadlineLines[0],
    heroLine2: settings.heroHeadlineLines[1],
    heroLine3: settings.heroHeadlineLines[2],
    heroSubtext: settings.heroSubtext,
    heroImage: settings.heroImage,
    freeShippingThreshold: String(settings.freeShippingThreshold),
    shippingFee: String(settings.shippingFee),
    taxRate: String(settings.taxRate * 100),
    codFee: String(settings.codFee),
    announcementEnabled: settings.announcementEnabled,
    announcementText: settings.announcementText,
    maintenanceMode: settings.maintenanceMode,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateSiteSettings({
        siteName: form.siteName,
        tagline: form.tagline,
        heroHeadlineLines: [form.heroLine1, form.heroLine2, form.heroLine3],
        heroSubtext: form.heroSubtext,
        heroImage: form.heroImage,
        freeShippingThreshold: parseFloat(form.freeShippingThreshold) || 0,
        shippingFee: parseFloat(form.shippingFee) || 0,
        taxRate: (parseFloat(form.taxRate) || 0) / 100,
        codFee: parseFloat(form.codFee) || 0,
        announcementEnabled: form.announcementEnabled,
        announcementText: form.announcementText,
        maintenanceMode: form.maintenanceMode,
      });
      settings.update(updated); // sync local store with the server's canonical values
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCurrency(e: React.FormEvent) {
    e.preventDefault();
    const code = newCode.trim().toUpperCase();
    const rate = parseFloat(newRate);
    if (!/^[A-Z]{3}$/.test(code)) {
      showToast("Enter a valid 3-letter ISO code (e.g. AED)", "error");
      return;
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      showToast("Enter a valid positive rate", "error");
      return;
    }
    setAddingCurrency(true);
    try {
      await addCurrency(code, rate);
      showToast(`${code} added`);
      setNewCode("");
      setNewRate("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add currency", "error");
    } finally {
      setAddingCurrency(false);
    }
  }

  async function handleRateChange(code: string, value: string) {
    const rate = parseFloat(value);
    if (!Number.isFinite(rate) || rate <= 0) return;
    setSavingCode(code);
    try {
      await setRate(code, rate);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update rate", "error");
    } finally {
      setSavingCode(null);
    }
  }

  async function handleRemoveCurrency(code: string) {
    if (!confirm(`Remove ${code}? Products without an explicit ${code} price will stop showing one.`)) return;
    try {
      await removeCurrency(code);
      showToast(`${code} removed`, "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove currency", "error");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Settings</h1>
      <p className="mt-1 font-body text-sm text-muted">Site-wide configuration — changes apply across the storefront.</p>

      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-white/5 bg-surface p-6">
          <h2 className="font-display text-base font-bold text-ink">Brand</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-body text-xs text-muted">Site name</label>
              <input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-xs text-muted">Tagline</label>
              <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-surface p-6">
          <h2 className="font-display text-base font-bold text-ink">Hero section</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <input value={form.heroLine1} onChange={(e) => setForm({ ...form, heroLine1: e.target.value })} placeholder="Line 1"
              className="rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50" />
            <input value={form.heroLine2} onChange={(e) => setForm({ ...form, heroLine2: e.target.value })} placeholder="Line 2"
              className="rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50" />
            <input value={form.heroLine3} onChange={(e) => setForm({ ...form, heroLine3: e.target.value })} placeholder="Line 3"
              className="rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50" />
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block font-body text-xs text-muted">Subtext</label>
            <textarea value={form.heroSubtext} onChange={(e) => setForm({ ...form, heroSubtext: e.target.value })} rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50" />
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block font-body text-xs text-muted">Background image URL</label>
            <input value={form.heroImage} onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-surface p-6">
          <h2 className="font-display text-base font-bold text-ink">Shipping & tax</h2>
          <p className="mt-1 font-body text-xs text-muted">All amounts below are in ₹ (INR) — the store's base currency.</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1.5 block font-body text-xs text-muted">Free ship over (₹)</label>
              <input type="number" value={form.freeShippingThreshold} onChange={(e) => setForm({ ...form, freeShippingThreshold: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-xs text-muted">Shipping fee (₹)</label>
              <input type="number" step="0.01" value={form.shippingFee} onChange={(e) => setForm({ ...form, shippingFee: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-xs text-muted">Tax rate (%)</label>
              <input type="number" step="0.1" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-xs text-muted">COD fee (₹)</label>
              <input type="number" step="0.01" value={form.codFee} onChange={(e) => setForm({ ...form, codFee: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-surface p-6">
          <h2 className="font-display text-base font-bold text-ink">Currency conversion rates</h2>
          <p className="mt-1 font-body text-xs text-muted">
            Base currency is ₹ (INR) — 1 INR equals the value below. Used only when a product has no explicit
            regional price set.
          </p>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-bg px-3 py-2.5">
              <span className="font-mono text-xs text-ink">INR (base)</span>
              <span className="font-mono text-xs text-muted">1.00 — fixed</span>
            </div>
            {currencies
              .filter((c) => c.code !== "INR")
              .map((c) => (
                <div key={c.code} className="flex items-center gap-3 rounded-xl border border-white/5 bg-bg px-3 py-2.5">
                  <span className="w-14 font-mono text-xs text-ink">{c.code}</span>
                  <input
                    type="number"
                    step="0.0001"
                    defaultValue={rates[c.code]}
                    onBlur={(e) => handleRateChange(c.code, e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-surface px-3 py-1.5 font-mono text-xs text-ink focus:outline-none focus:border-accent/50"
                  />
                  {savingCode === c.code && <Loader2 size={14} className="animate-spin text-muted" />}
                  <button type="button" onClick={() => handleRemoveCurrency(c.code)} className="shrink-0 text-muted hover:text-accent2">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>

          <form onSubmit={handleAddCurrency} className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block font-body text-xs text-muted">Add currency (ISO code)</label>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="AED"
                maxLength={3}
                className="w-full rounded-lg border border-white/10 bg-bg px-3 py-2 font-mono text-xs uppercase text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block font-body text-xs text-muted">1 INR = ?</label>
              <input
                type="number"
                step="0.0001"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="0.044"
                className="w-full rounded-lg border border-white/10 bg-bg px-3 py-2 font-mono text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
              />
            </div>
            <button
              type="submit"
              disabled={addingCurrency}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 py-2 font-body text-xs font-semibold text-bg disabled:opacity-70"
            >
              {addingCurrency ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-white/5 bg-surface p-6">
          <h2 className="font-display text-base font-bold text-ink">Site-wide announcement</h2>
          <label className="mt-4 flex items-center justify-between">
            <span className="font-body text-sm text-ink">Show announcement banner</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, announcementEnabled: !form.announcementEnabled })}
              className={cn("relative h-6 w-11 rounded-full transition-colors", form.announcementEnabled ? "bg-accent" : "bg-white/10")}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-bg transition-transform", form.announcementEnabled ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </label>
          <div className="mt-4">
            <input value={form.announcementText} onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50" />
          </div>
          <p className="mt-2 font-body text-[11px] text-muted">Not yet rendered on the storefront — see note below.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 rounded-full px-6 py-3 font-body text-sm font-semibold transition-transform disabled:opacity-70",
            saved ? "bg-accent/80 text-bg" : "bg-accent text-bg hover:scale-[1.02]"
          )}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saved && <Check size={16} />}
          {saving ? "Saving…" : saved ? "Saved" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}