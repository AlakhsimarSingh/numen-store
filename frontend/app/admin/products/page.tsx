"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2, Pencil, Plus, Search, Trash2, UploadCloud, X } from "lucide-react";
import { fetchCategories, type Category } from "@/src/lib/categories";
import { fetchProducts, createProduct, updateProduct, deleteProduct } from "@/src/lib/products";
import { uploadMedia, deleteMedia } from "@/src/lib/media";
import { useToastStore } from "@/src/hooks/useToastStore";
import { ColorOption, Product, VariantStockEntry } from "@/src/types";
import { formatPrice, cn } from "@/src/lib/utils";
import VariantsEditor from "@/components/admin/VariantsEditor";

const ease = [0.16, 1, 0.3, 1] as const;

type RegionalCode = "INR" | "EUR" | "GBP";

type FormState = {
  name: string;
  categorySlug: string;
  price: string;
  compareAtPrice: string;
  image: string;
  video: string;
  stock: string;
  isNew: boolean;
  isSpotlight: boolean;
  rating: string;
  colors: ColorOption[];
  sizes: string[];
  variantStock: VariantStockEntry[];
  regionalPrices: Partial<Record<RegionalCode, { price: string; compareAtPrice: string }>>;
};

const emptyForm: FormState = {
  name: "",
  categorySlug: "",
  price: "",
  compareAtPrice: "",
  image: "",
  video: "",
  stock: "",
  isNew: false,
  isSpotlight: false,
  rating: "4.5",
  colors: [],
  sizes: [],
  variantStock: [],
  regionalPrices: {},
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((s) => s.show);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"basic" | "variants" | "pricing">("basic");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Every file uploaded to Supabase during the current modal session, so we
  // can delete anything that never ends up referenced by a saved product —
  // storage is limited on the free tier and we don't want silent leaks.
  const pendingUploadsRef = useRef<{ url: string; path: string }[]>([]);

  function registerUpload(url: string, path: string) {
    pendingUploadsRef.current.push({ url, path });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([fetchProducts(), fetchCategories()]);
        if (!cancelled) {
          setProducts(productsData);
          setCategories(categoriesData);
        }
      } catch (err) {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : "Failed to load data", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.categorySlug === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, categoryFilter]);

  function openAdd() {
    pendingUploadsRef.current = [];
    setEditingId(null);
    setForm({ ...emptyForm, categorySlug: categories[0]?.slug ?? "" });
    setTab("basic");
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    pendingUploadsRef.current = [];
    setEditingId(p.id);
    setForm({
      name: p.name,
      categorySlug: p.categorySlug,
      price: String(p.price),
      compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "",
      image: p.image,
      video: p.video ?? "",
      stock: String(p.stock),
      isNew: p.isNew,
      isSpotlight: p.isSpotlight,
      rating: String(p.rating),
      colors: p.colors ?? [],
      sizes: p.sizes ?? [],
      variantStock: p.variantStock ?? [],
      regionalPrices: Object.fromEntries(
        Object.entries(p.regionalPrices ?? {}).map(([code, v]) => [
          code,
          { price: String(v?.price ?? ""), compareAtPrice: v?.compareAtPrice ? String(v.compareAtPrice) : "" },
        ])
      ),
    });
    setTab("basic");
    setModalOpen(true);
  }

  /** Modal dismissed without saving — clean up every upload made this session. */
  function handleModalDismiss() {
    const toDelete = pendingUploadsRef.current;
    pendingUploadsRef.current = [];
    toDelete.forEach((u) => {
      deleteMedia(u.path);
    });
    setModalOpen(false);
  }

  /** Modal closed because of a successful save — only clean up uploads that never made it into the final payload. */
  function cleanupUnusedUploadsAfterSave(payload: Record<string, unknown>) {
    const referenced = new Set<string>();
    const add = (u?: string | null) => {
      if (u) referenced.add(u);
    };
    add(payload.image as string | undefined);
    (payload.images as string[] | undefined)?.forEach(add);
    add(payload.video as string | null | undefined);
    (payload.colors as ColorOption[] | undefined)?.forEach((c) => {
      c.images?.forEach(add);
      add(c.video);
    });

    const leftover = pendingUploadsRef.current.filter((u) => !referenced.has(u.url));
    pendingUploadsRef.current = [];
    leftover.forEach((u) => {
      deleteMedia(u.path);
    });
  }

  async function handleUpload(file: File | undefined, onDone: (url: string) => void) {
    if (!file) return;
    setUploadingMain(true);
    try {
      const { url, path } = await uploadMedia(file);
      registerUpload(url, path);
      onDone(url);
      showToast("File uploaded");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploadingMain(false);
    }
  }

  async function handleVideoUpload(file: File | undefined) {
    if (!file) return;
    setUploadingVideo(true);
    try {
      const { url, path } = await uploadMedia(file);
      registerUpload(url, path);
      setForm((f) => ({ ...f, video: url }));
      showToast("Video uploaded");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.categorySlug || !form.price || !form.image) return;
    setSaving(true);

    const hasVariants = form.colors.length > 0 || form.sizes.length > 0;
    const hasColors = form.colors.length > 0;
    const aggregateStock = hasVariants
      ? form.variantStock.reduce((sum, v) => sum + (v.stock || 0), 0)
      : parseInt(form.stock || "0", 10);

    const regionalPrices = Object.fromEntries(
      Object.entries(form.regionalPrices)
        .filter(([, v]) => v?.price)
        .map(([code, v]) => [
          code,
          { price: parseFloat(v!.price), compareAtPrice: v!.compareAtPrice ? parseFloat(v!.compareAtPrice) : undefined },
        ])
    );

    const payload = {
      name: form.name,
      categorySlug: form.categorySlug,
      price: parseFloat(form.price),
      compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
      image: form.colors[0]?.images[0] || form.image,
      images: [form.image],
      // Product-level video is only ever shown when there are no colors —
      // ProductDetail falls back to per-color video otherwise. Clear it
      // explicitly if colors exist so it doesn't linger unused in storage.
      video: hasColors ? null : form.video || undefined,
      stock: aggregateStock,
      isNew: form.isNew,
      isSpotlight: form.isSpotlight,
      rating: parseFloat(form.rating || "4.5"),
      colors: form.colors.length > 0 ? form.colors : undefined,
      sizes: form.sizes.length > 0 ? form.sizes : undefined,
      variantStock: hasVariants ? form.variantStock : undefined,
      regionalPrices: Object.keys(regionalPrices).length > 0 ? regionalPrices : undefined,
    };

    try {
      if (editingId) {
        const updated = await updateProduct(editingId, payload);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast("Product updated");
      } else {
        const created = await createProduct(payload);
        setProducts((prev) => [created, ...prev]);
        showToast("Product added");
      }
      cleanupUnusedUploadsAfterSave(payload);
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save product", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast("Product deleted", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete product", "error");
    }
  }

  function updateRegionalField(code: RegionalCode, field: "price" | "compareAtPrice", value: string) {
    setForm((prev) => ({
      ...prev,
      regionalPrices: {
        ...prev.regionalPrices,
        [code]: {
          price: field === "price" ? value : (prev.regionalPrices[code]?.price ?? ""),
          compareAtPrice: field === "compareAtPrice" ? value : (prev.regionalPrices[code]?.compareAtPrice ?? ""),
        },
      },
    }));
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
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Products</h1>
          <p className="mt-1 font-body text-sm text-muted">{products.length} total products</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02]"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-surface px-4 py-2.5">
          <Search size={15} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-full border border-white/10 bg-surface px-4 py-2.5 font-body text-sm text-ink focus:outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-surface">
        <div className="hidden grid-cols-[1fr_120px_100px_100px_100px] gap-4 border-b border-white/5 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted lg:grid">
          <span>Product</span>
          <span>Category</span>
          <span>Price</span>
          <span>Stock</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-white/5">
          {filtered.map((p) => {
            const cat = categories.find((c) => c.slug === p.categorySlug);
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 px-5 py-4 lg:grid lg:grid-cols-[1fr_120px_100px_100px_100px] lg:items-center lg:gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-surface2">
                    <Image src={p.image} alt={p.name} fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-body text-sm text-ink">{p.name}</p>
                    <div className="flex items-center gap-2">
                      {p.isNew && <span className="font-mono text-[10px] text-accent">New</span>}
                      {p.isSpotlight && <span className="font-mono text-[10px] text-accent2">★ Spotlight</span>}
                      {p.colors?.length || p.sizes?.length ? (
                        <span className="font-mono text-[10px] text-muted">
                          {p.colors?.length ? `${p.colors.length} colors` : ""}
                          {p.colors?.length && p.sizes?.length ? " · " : ""}
                          {p.sizes?.length ? `${p.sizes.length} sizes` : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <span className="font-body text-xs text-muted lg:text-sm">{cat?.name ?? p.categorySlug}</span>
                <span className="font-mono text-sm text-ink">{formatPrice(p.price)}</span>
                <span
                  className={cn(
                    "font-mono text-xs",
                    p.stock === 0 ? "text-accent2" : p.stock <= 5 ? "text-accent" : "text-muted"
                  )}
                >
                  {p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}
                </span>
                <div className="flex items-center gap-3 lg:justify-end">
                  <button onClick={() => openEdit(p)} className="text-muted hover:text-accent">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(p.id, p.name)} className="text-muted hover:text-accent2">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-5 py-10 text-center font-body text-sm text-muted">No products match your filters.</p>
          )}
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4"
          onClick={handleModalDismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">{editingId ? "Edit Product" : "Add Product"}</h3>
              <button onClick={handleModalDismiss} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              {(["basic", "variants", "pricing"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 font-body text-xs capitalize transition-colors",
                    tab === t ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted"
                  )}
                >
                  {t === "basic" ? "Basic Info" : t === "variants" ? "Colors, Sizes & Media" : "Regional Pricing"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {tab === "basic" && (
                <>
                  <div>
                    <label className="mb-1.5 block font-body text-xs text-muted">Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block font-body text-xs text-muted">Category</label>
                      <select
                        value={form.categorySlug}
                        onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                      >
                        {categories.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block font-body text-xs text-muted">
                        Base Stock {(form.colors.length > 0 || form.sizes.length > 0) && "(auto)"}
                      </label>
                      <input
                        type="number"
                        min={0}
                        disabled={form.colors.length > 0 || form.sizes.length > 0}
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50 disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block font-body text-xs text-muted">Price (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-body text-xs text-muted">Compare-at price (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.compareAtPrice}
                        onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-xs text-muted">Fallback image</label>
                    <div className="flex gap-2">
                      <input
                        value={form.image}
                        onChange={(e) => setForm({ ...form, image: e.target.value })}
                        placeholder="https://…"
                        className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                      />
                      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-body text-xs text-muted hover:text-accent">
                        {uploadingMain ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            handleUpload(file, (url) => setForm((f) => ({ ...f, image: url })));
                          }}
                        />
                      </label>
                    </div>
                    <p className="mt-1 font-body text-[11px] text-muted">Used if no color images are set below.</p>
                  </div>

                  {form.colors.length === 0 && (
                    <div>
                      <label className="mb-1.5 block font-body text-xs text-muted">Video (optional)</label>
                      <div className="flex gap-2">
                        <input
                          value={form.video}
                          onChange={(e) => setForm({ ...form, video: e.target.value })}
                          placeholder="https://…"
                          className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                        />
                        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-body text-xs text-muted hover:text-accent">
                          {uploadingVideo ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                          Upload
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              handleVideoUpload(file);
                            }}
                          />
                        </label>
                      </div>
                      <p className="mt-1 font-body text-[11px] text-muted">
                        Only used when the product has no colors — add colors to attach a video per color instead.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 font-body text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={form.isNew}
                        onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
                        className="h-4 w-4 rounded border-white/10 bg-bg accent-[var(--color-accent)]"
                      />
                      Mark as New
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="font-body text-xs text-muted">Rating</label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={5}
                        value={form.rating}
                        onChange={(e) => setForm({ ...form, rating: e.target.value })}
                        className="w-16 rounded-lg border border-white/10 bg-bg px-2 py-1.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 font-body text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={form.isSpotlight}
                      onChange={(e) => setForm({ ...form, isSpotlight: e.target.checked })}
                      className="h-4 w-4 rounded border-white/10 bg-bg accent-[var(--color-accent)]"
                    />
                    Feature in homepage Spotlight Drop
                  </label>
                </>
              )}

              {tab === "variants" && (
                <VariantsEditor
                  colors={form.colors}
                  sizes={form.sizes}
                  variantStock={form.variantStock}
                  onChange={(data) => setForm({ ...form, ...data })}
                  onMediaUploaded={registerUpload}
                />
              )}

              {tab === "pricing" && (
                <div className="space-y-4">
                  <p className="font-body text-xs text-muted">
                    Set exact prices per currency. Leave blank to auto-estimate from the USD price using the site&apos;s
                    fallback conversion rate (configured in Settings).
                  </p>
                  {(["INR", "EUR", "GBP"] as const).map((code) => (
                    <div key={code} className="rounded-xl border border-white/10 bg-bg p-3">
                      <p className="mb-2 font-mono text-xs text-accent">{code}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={form.regionalPrices[code]?.price ?? ""}
                          onChange={(e) => updateRegionalField(code, "price", e.target.value)}
                          className="rounded-lg border border-white/10 bg-surface px-3 py-1.5 font-mono text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Compare-at (optional)"
                          value={form.regionalPrices[code]?.compareAtPrice ?? ""}
                          onChange={(e) => updateRegionalField(code, "compareAtPrice", e.target.value)}
                          className="rounded-lg border border-white/10 bg-surface px-3 py-1.5 font-mono text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Saving…" : editingId ? "Save Changes" : "Add Product"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}