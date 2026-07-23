"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { fetchCategories, createCategory, updateCategory, deleteCategory, Category } from "@/src/lib/categories";
import { useToastStore } from "@/src/hooks/useToastStore";
import { iconOptions, iconNames } from "@/src/lib/iconMap";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((s) => s.show);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [iconName, setIconName] = useState(iconNames[0]);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetchCategories()
      .then(setCategories)
      .catch(() => showToast("Failed to load categories.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [showToast]);

  function openAdd() {
    setEditingSlug(null);
    setName("");
    setIconName(iconNames[0]);
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingSlug(cat.slug);
    setName(cat.name);
    setIconName(cat.iconName);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingSlug) {
        const updated = await updateCategory(editingSlug, { name, iconName });
        setCategories((prev) => prev.map((c) => (c.slug === editingSlug ? updated : c)));
        showToast("Category updated");
      } else {
        const created = await createCategory(name, iconName);
        setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        showToast("Category added");
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    }
    setSaving(false);
  }

  async function handleDelete(cat: Category) {
    if (cat.productCount > 0) {
      showToast(`Can't delete — ${cat.productCount} product(s) still use this category`, "error");
      return;
    }
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.slug);
      setCategories((prev) => prev.filter((c) => c.slug !== cat.slug));
      showToast("Category deleted", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete category.", "error");
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
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Categories</h1>
          <p className="mt-1 font-body text-sm text-muted">{categories.length} categories</p>
        </div>
        <button onClick={openAdd} className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02]">
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const Icon = iconOptions[cat.iconName] ?? iconOptions[iconNames[0]];
          return (
            <div key={cat.slug} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-surface p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink">
                <Icon size={18} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm text-ink">{cat.name}</p>
                <p className="font-mono text-xs text-muted">{cat.productCount} products</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(cat)} className="text-muted hover:text-accent"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(cat)} className="text-muted hover:text-accent2"><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
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
              <h3 className="font-display text-lg font-bold text-ink">{editingSlug ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50" />
              </div>

              <div>
                <label className="mb-2 block font-body text-xs text-muted">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {iconNames.map((n) => {
                    const IconOption = iconOptions[n];
                    const active = iconName === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setIconName(n)}
                        className={cn(
                          "flex h-10 items-center justify-center rounded-xl border transition-colors",
                          active ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-ink"
                        )}
                      >
                        <IconOption size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:opacity-70">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Saving…" : editingSlug ? "Save Changes" : "Add Category"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}