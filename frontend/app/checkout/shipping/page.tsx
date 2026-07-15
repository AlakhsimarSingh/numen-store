"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, MapPin, Phone, User } from "lucide-react";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";
import AddressMapPicker, { PickedAddress } from "@/components/checkout/AddressMapPicker";
import { useCheckoutStore } from "@/src/hooks/useCheckoutStore";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;
const countries = ["United States", "India", "United Kingdom", "Canada", "Australia"];

interface FormErrors {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export default function ShippingPage() {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const shipping = useCheckoutStore((s) => s.shipping);
  const setShipping = useCheckoutStore((s) => s.setShipping);

  const [fullName, setFullName] = useState(shipping?.fullName ?? "");
  const [phone, setPhone] = useState(shipping?.phone ?? "");
  const [addressLine1, setAddressLine1] = useState(shipping?.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(shipping?.addressLine2 ?? "");
  const [city, setCity] = useState(shipping?.city ?? "");
  const [state, setState] = useState(shipping?.state ?? "");
  const [zip, setZip] = useState(shipping?.zip ?? "");
  const [country, setCountry] = useState(shipping?.country ?? countries[0]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>(
    shipping?.lat && shipping?.lng ? { lat: shipping.lat, lng: shipping.lng } : undefined
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={28} />
      </div>
    );
  }

  function handlePickedAddress(picked: PickedAddress) {
    if (picked.addressLine1) setAddressLine1(picked.addressLine1);
    if (picked.city) setCity(picked.city);
    if (picked.state) setState(picked.state);
    if (picked.zip) setZip(picked.zip);
    if (picked.country && countries.includes(picked.country)) setCountry(picked.country);
    setCoords({ lat: picked.lat, lng: picked.lng });
  }

  function validate() {
    const next: FormErrors = {};
    if (fullName.trim().length < 2) next.fullName = "Enter your full name.";
    if (!/^[\d+()\-\s]{7,}$/.test(phone)) next.phone = "Enter a valid phone number.";
    if (addressLine1.trim().length < 4) next.addressLine1 = "Enter your street address.";
    if (city.trim().length < 2) next.city = "Enter your city.";
    if (state.trim().length < 2) next.state = "Enter your state/region.";
    if (!/^[\w\-\s]{3,}$/.test(zip)) next.zip = "Enter a valid postal code.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setShipping({
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      country,
      lat: coords?.lat,
      lng: coords?.lng,
    });
    setTimeout(() => {
      setSubmitting(false);
      router.push("/checkout/payment");
    }, 500);
  }

  return (
    <div>
      <CheckoutProgress current={1} />

      <div className="mx-auto max-w-3xl px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Shipping details</h1>
          <p className="mt-2 font-body text-sm text-muted">Tell us where to send your drop.</p>

          <div className="mt-8 rounded-2xl border border-white/5 bg-surface p-6 sm:p-8">
            <AddressMapPicker onConfirm={handlePickedAddress} />

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">Full name</label>
                  <div
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border bg-bg px-4 py-3",
                      errors.fullName ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
                    )}
                  >
                    <User size={16} className="shrink-0 text-muted" />
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                    />
                  </div>
                  {errors.fullName && <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">Phone number</label>
                  <div
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border bg-bg px-4 py-3",
                      errors.phone ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
                    )}
                  >
                    <Phone size={16} className="shrink-0 text-muted" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                    />
                  </div>
                  {errors.phone && <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Address line 1</label>
                <div
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border bg-bg px-4 py-3",
                    errors.addressLine1 ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
                  )}
                >
                  <MapPin size={16} className="shrink-0 text-muted" />
                  <input
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="123 Drop Street"
                    className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                  />
                </div>
                {errors.addressLine1 && (
                  <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.addressLine1}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Address line 2 (optional)</label>
                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-bg px-4 py-3 focus-within:border-accent/50">
                  <input
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, unit…"
                    className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">City</label>
                  <div
                    className={cn(
                      "rounded-xl border bg-bg px-4 py-3",
                      errors.city ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
                    )}
                  >
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ludhiana"
                      className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                    />
                  </div>
                  {errors.city && <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.city}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">State</label>
                  <div
                    className={cn(
                      "rounded-xl border bg-bg px-4 py-3",
                      errors.state ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
                    )}
                  >
                    <input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Punjab"
                      className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                    />
                  </div>
                  {errors.state && <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.state}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">Postal code</label>
                  <div
                    className={cn(
                      "rounded-xl border bg-bg px-4 py-3",
                      errors.zip ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
                    )}
                  >
                    <input
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="141001"
                      className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                    />
                  </div>
                  {errors.zip && <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.zip}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Country</label>
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
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Saving…" : "Continue to Payment"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}