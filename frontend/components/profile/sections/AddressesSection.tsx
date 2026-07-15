"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin, Plus, Star, Trash2, X } from "lucide-react";
import { Address, fetchAddresses, createAddress, deleteAddress, setDefaultAddress } from "@/src/lib/addresses";
import AddressMapPicker, { PickedAddress } from "@/components/checkout/AddressMapPicker";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;
const countries = ["United States", "India", "United Kingdom", "Canada", "Australia"];

export default function AddressesSection() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [label, setLabel] = useState("Home");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState(countries[0]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAddresses()
      .then(setAddresses)
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setLabel("Home");
    setFullName("");
    setPhone("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setState("");
    setZip("");
    setCountry(countries[0]);
    setCoords(null);
  }

  function handlePickedAddress(picked: PickedAddress) {
    if (picked.addressLine1) setAddressLine1(picked.addressLine1);
    if (picked.city) setCity(picked.city);
    if (picked.state) setState(picked.state);
    if (picked.zip) setZip(picked.zip);
    if (picked.country && countries.includes(picked.country)) setCountry(picked.country);
    setCoords({ lat: picked.lat, lng: picked.lng });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !phone || !addressLine1 || !city || !state || !zip) return;
    setSaving(true);
    try {
      const created = await createAddress({
        label,
        fullName,
        phone,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        zip,
        country,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      setAddresses((prev) => [created, ...prev.map((a) => (created.isDefault ? { ...a, isDefault: false } : a))]);
      setShowForm(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    const updated = await setDefaultAddress(id);
    setAddresses((prev) => prev.map((a) => (a.id === id ? updated : { ...a, isDefault: false })));
  }

  async function handleDelete(id: string) {
    await deleteAddress(id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
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
      {addresses.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-surface p-8 text-center">
          <MapPin size={24} className="mx-auto text-muted" />
          <p className="mt-3 font-body text-sm text-muted">No saved addresses yet.</p>
        </div>
      )}

      {addresses.map((addr) => (
        <div key={addr.id} className="rounded-2xl border border-white/5 bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-surface2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted">
                {addr.label}
              </span>
              {addr.isDefault && (
                <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                  <Star size={10} fill="currentColor" /> Default
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!addr.isDefault && (
                <button onClick={() => handleSetDefault(addr.id)} className="font-body text-xs text-muted hover:text-accent">
                  Set default
                </button>
              )}
              <button onClick={() => handleDelete(addr.id)} className="text-muted hover:text-accent2">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <p className="mt-3 font-body text-sm text-ink">
            {addr.fullName} · {addr.phone}
          </p>
          <p className="font-body text-sm text-muted">
            {addr.addressLine1}
            {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}, {addr.city}, {addr.state} {addr.zip}, {addr.country}
          </p>
        </div>
      ))}

      {showForm ? (
        <div className="rounded-2xl border border-white/5 bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink">New address</h3>
            <button onClick={() => setShowForm(false)} className="text-muted hover:text-ink">
              <X size={18} />
            </button>
          </div>

          <AddressMapPicker onConfirm={handlePickedAddress} />

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Label</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Home, Work…"
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-body text-xs text-muted">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-body text-xs text-muted">Address line 1</label>
              <input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-body text-xs text-muted">Address line 2 (optional)</label>
              <input
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
              />
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
              />
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="Postal code"
                className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
              />
            </div>

            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
            >
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? "Saving…" : "Save Address"}
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-4 font-body text-sm text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          <Plus size={16} /> Add new address
        </button>
      )}
    </motion.div>
  );
}