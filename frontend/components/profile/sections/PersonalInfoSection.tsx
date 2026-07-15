"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { fetchProfile, updateProfile, Profile } from "@/src/lib/profile";
import { categories } from "@/src/data/categories";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;
const topSizes = ["XS", "S", "M", "L", "XL", "XXL"];
const bottomSizes = ["28", "30", "32", "34", "36", "38"];
const styleTagOptions = ["Streetwear", "Minimalist", "Formal", "Athleisure", "Vintage", "Techwear", "Casual", "Bold"];
const genderOptions = ["Prefer not to say", "Male", "Female", "Non-binary"];

export default function PersonalInfoSection() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [phoneInput, setPhoneInput] = useState("");
  const [genderInput, setGenderInput] = useState(genderOptions[0]);
  const [dobInput, setDobInput] = useState("");
  const [topSize, setTopSize] = useState("");
  const [bottomSize, setBottomSize] = useState("");
  const [shoeSize, setShoeSize] = useState("");

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile()
      .then((data) => {
        setProfile(data);
        setPhoneInput(data.phone);
        setGenderInput(data.gender || genderOptions[0]);
        setDobInput(data.dob);
        setTopSize(data.sizes.top);
        setBottomSize(data.sizes.bottom);
        setShoeSize(data.sizes.shoe);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProfile({
        phone: phoneInput,
        gender: genderInput,
        dob: dobInput,
        sizes: { top: topSize, bottom: bottomSize, shoe: shoeSize },
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(slug: string) {
    if (!profile) return;
    const next = profile.favoriteCategories.includes(slug)
      ? profile.favoriteCategories.filter((c) => c !== slug)
      : [...profile.favoriteCategories, slug];
    setProfile({ ...profile, favoriteCategories: next });
    await updateProfile({ favoriteCategories: next });
  }

  async function toggleStyleTag(tag: string) {
    if (!profile) return;
    const next = profile.styleTags.includes(tag)
      ? profile.styleTags.filter((t) => t !== tag)
      : [...profile.styleTags, tag];
    setProfile({ ...profile, styleTags: next });
    await updateProfile({ styleTags: next });
  }

  if (loading || !profile) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-ink">Personal details</h2>
        <p className="mt-1 font-body text-xs text-muted">Used for order updates and account recovery.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-body text-xs text-muted">Phone number</label>
            <input
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-xs text-muted">Date of birth</label>
            <input
              type="date"
              value={dobInput}
              onChange={(e) => setDobInput(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block font-body text-xs text-muted">Gender</label>
            <select
              value={genderInput}
              onChange={(e) => setGenderInput(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
            >
              {genderOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-ink">Size profile</h2>
        <p className="mt-1 font-body text-xs text-muted">Helps us recommend the right fit — nothing else.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block font-body text-xs text-muted">Top size</label>
            <select
              value={topSize}
              onChange={(e) => setTopSize(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
            >
              <option value="">Select</option>
              {topSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block font-body text-xs text-muted">Bottom size (waist)</label>
            <select
              value={bottomSize}
              onChange={(e) => setBottomSize(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
            >
              <option value="">Select</option>
              {bottomSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block font-body text-xs text-muted">Shoe size</label>
            <input
              value={shoeSize}
              onChange={(e) => setShoeSize(e.target.value)}
              placeholder="e.g. 9.5"
              className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-ink">Favorite categories</h2>
        <p className="mt-1 font-body text-xs text-muted">Pick what you shop for most — saved instantly.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => {
            const active = profile.favoriteCategories.includes(cat.slug);
            return (
              <button
                key={cat.slug}
                onClick={() => toggleCategory(cat.slug)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 font-body text-xs transition-colors",
                  active ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-ink"
                )}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-ink">Style</h2>
        <p className="mt-1 font-body text-xs text-muted">What describes your taste? Pick as many as fit.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {styleTagOptions.map((tag) => {
            const active = profile.styleTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleStyleTag(tag)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 font-body text-xs transition-colors",
                  active ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-ink"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "flex items-center gap-2 rounded-full px-6 py-3 font-body text-sm font-semibold transition-transform disabled:cursor-not-allowed",
          saved ? "bg-accent/80 text-bg" : "bg-accent text-bg hover:scale-[1.02]"
        )}
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saved && <Check size={16} />}
        {saving ? "Saving…" : saved ? "Saved" : "Save Changes"}
      </button>
    </motion.div>
  );
}