"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2, Pencil, Plus, Search, Star, Trash2, UploadCloud, X } from "lucide-react";
import { fetchCategories, type Category } from "@/src/lib/categories";
import { fetchProducts, createProduct, updateProduct, deleteProduct } from "@/src/lib/products";
import { uploadMedia, deleteMedia } from "@/src/lib/media";
import { useToastStore } from "@/src/hooks/useToastStore";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { ColorOption, Product, VariantStockEntry } from "@/src/types";
import { cn } from "@/src/lib/utils";
import VariantsEditor from "@/components/admin/VariantsEditor";
import { useRouter } from "next/navigation";

const ease = [0.16, 1, 0.3, 1] as const;

const formatBasePriceINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

type FormState = {
  name: string;
  categorySlug: string;
  price: string;
  compareAtPrice: string;
  image: string; // main — required
  hoverImage: string; // shown on card hover
  thirdImage: string; // shown in product page gallery only
  video: string;
  stock: string;
  isNew: boolean;
  isSpotlight: boolean;
  rating: string;
  colors: ColorOption[];
  sizes: string[];
  variantStock: VariantStockEntry[];
  regionalPrices: Record<string, { price: string; compareAtPrice: string }>;
};

const emptyForm: FormState = {
  name: "",
  categorySlug: "",
  price: "",
  compareAtPrice: "",
  image: "",
  hoverImage: "",
  thirdImage: "",
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

type ImageSlotKey = "image" | "hoverImage" | "thirdImage";

function ImageSlot({
  label,
  hint,
  required,
  value,
  uploading,
  onUpload,
  onClear,
  selected,
  dragOver,
  dragging,
  pendingSwap,
  onSlotClick,
  onDragStartSlot,
  onDragOverSlot,
  onDropSlot,
  onDragEndSlot,
}: {
  label: string;
  hint: string;
  required?: boolean;
  value: string;
  uploading: boolean;
  onUpload: (file: File | undefined) => void;
  onClear: () => void;
  selected: boolean;
  dragOver: boolean;
  dragging: boolean;
  pendingSwap: boolean;
  onSlotClick: () => void;
  onDragStartSlot: (e: React.DragEvent) => void;
  onDragOverSlot: (e: React.DragEvent) => void;
  onDropSlot: (e: React.DragEvent) => void;
  onDragEndSlot: () => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="font-body text-xs text-muted">
          {label} {required && <span className="text-accent2">*</span>}
        </label>
      </div>

      {value ? (
        <div
          draggable
          onDragStart={onDragStartSlot}
          onDragOver={onDragOverSlot}
          onDrop={onDropSlot}
          onDragEnd={onDragEndSlot}
          onClick={onSlotClick}
          className={cn(
            "relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl border bg-surface2 transition-all",
            selected ? "border-accent ring-2 ring-inset ring-accent" : "border-white/10",
            dragOver && !selected && "ring-2 ring-inset ring-accent/60",
            dragging && "opacity-30"
          )}
        >
          <Image src={value} alt={label} fill sizes="200px" className="pointer-events-none object-cover" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-bg/80 text-ink backdrop-blur-sm hover:text-accent2"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <label
          onDragOver={onDragOverSlot}
          onDrop={onDropSlot}
          onClick={(e) => {
            // A swap is pending from another slot — complete it here instead
            // of opening the native file picker. Only intercept the click
            // when there's actually something to drop into this slot;
            // otherwise let the label behave normally so uploading still
            // works with no selection active.
            if (pendingSwap) {
              e.preventDefault();
              onSlotClick();
            }
          }}
          className={cn(
            "flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed bg-bg text-muted transition-all hover:border-accent/40 hover:text-accent",
            dragOver ? "border-accent/60 ring-2 ring-inset ring-accent/60" : "border-white/15"
          )}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
          <span className="font-mono text-[10px] uppercase tracking-wide">Upload</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              onUpload(file);
            }}
          />
        </label>
      )}
      <p className="mt-1 font-body text-[10px] leading-snug text-muted">{hint}</p>
    </div>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((s) => s.show);

  const currencies = useCurrencyStore((s) => s.currencies);
  const loadRates = useCurrencyStore((s) => s.loadRates);
  const regionalCurrencies = useMemo(() => currencies.filter((c) => c.code !== "INR"), [currencies]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"basic" | "variants" | "pricing">("basic");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<ImageSlotKey | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const router = useRouter();

  const pendingUploadsRef = useRef<{ url: string; path: string }[]>([]);

  // Same click-to-select-then-click-to-swap interaction as the bulk
  // importer, applied here to the three fixed slots (image / hoverImage /
  // thirdImage). Native drag-and-drop is layered on as a desktop
  // convenience; both paths call swapImageSlots().
  const [selectedImageSlot, setSelectedImageSlot] = useState<ImageSlotKey | null>(null);
  const [dragOverImageSlot, setDragOverImageSlot] = useState<ImageSlotKey | null>(null);
  const [draggingImageSlot, setDraggingImageSlot] = useState<ImageSlotKey | null>(null);
  const imageDragSourceRef = useRef<ImageSlotKey | null>(null);

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
        if (!cancelled) showToast(err instanceof Error ? err.message : "Failed to load data", "error");
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
    setSelectedImageSlot(null);
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
      hoverImage: p.images?.[0] ?? "",
      thirdImage: p.images?.[1] ?? "",
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
    setSelectedImageSlot(null);
    setModalOpen(true);
  }

  function handleModalDismiss() {
    const toDelete = pendingUploadsRef.current;
    pendingUploadsRef.current = [];
    toDelete.forEach((u) => deleteMedia(u.path));
    setSelectedImageSlot(null);
    setModalOpen(false);
  }

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
    leftover.forEach((u) => deleteMedia(u.path));
  }

  async function handleSlotUpload(slot: ImageSlotKey, file: File | undefined) {
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const { url, path } = await uploadMedia(file);
      registerUpload(url, path);
      setForm((f) => ({ ...f, [slot]: url }));
      showToast("Image uploaded");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploadingSlot(null);
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

  // Swaps whatever is in slot A with whatever is in slot B — including
  // empty strings. Swapping into an empty slot leaves the source empty
  // (a plain move); swapping between two filled slots exchanges them.
  function swapImageSlots(a: ImageSlotKey, b: ImageSlotKey) {
    if (a === b) return;
    setForm((f) => ({ ...f, [a]: f[b], [b]: f[a] }));
  }

  function handleImageSlotClick(key: ImageSlotKey) {
    const hasImage = !!form[key];

    if (!selectedImageSlot) {
      if (!hasImage) return; // nothing to pick up from an empty slot
      setSelectedImageSlot(key);
      return;
    }

    if (selectedImageSlot === key) {
      setSelectedImageSlot(null); // clicked the same slot again — deselect
      return;
    }

    swapImageSlots(selectedImageSlot, key);
    setSelectedImageSlot(null);
  }

  function handleImageDragStart(e: React.DragEvent, key: ImageSlotKey) {
    if (!form[key]) {
      e.preventDefault();
      return;
    }
    imageDragSourceRef.current = key;
    setDraggingImageSlot(key);
    e.dataTransfer.effectAllowed = "move";
    // Firefox requires setData to be called for the drag to actually start.
    e.dataTransfer.setData("text/plain", "image-slot");
  }

  function handleImageDragOver(e: React.DragEvent, key: ImageSlotKey) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverImageSlot !== key) setDragOverImageSlot(key);
  }

  function handleImageDrop(e: React.DragEvent, key: ImageSlotKey) {
    e.preventDefault();
    const source = imageDragSourceRef.current;
    imageDragSourceRef.current = null;
    setDraggingImageSlot(null);
    setDragOverImageSlot(null);
    if (!source) return;
    swapImageSlots(source, key);
  }

  function handleImageDragEnd() {
    imageDragSourceRef.current = null;
    setDraggingImageSlot(null);
    setDragOverImageSlot(null);
  }

  function imageSlotProps(key: ImageSlotKey) {
    return {
      selected: selectedImageSlot === key,
      dragOver: dragOverImageSlot === key,
      dragging: draggingImageSlot === key,
      pendingSwap: !!selectedImageSlot && selectedImageSlot !== key,
      onSlotClick: () => handleImageSlotClick(key),
      onDragStartSlot: (e: React.DragEvent) => handleImageDragStart(e, key),
      onDragOverSlot: (e: React.DragEvent) => handleImageDragOver(e, key),
      onDropSlot: (e: React.DragEvent) => handleImageDrop(e, key),
      onDragEndSlot: handleImageDragEnd,
    };
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

    // Main image + up to two extras (hover, then a third gallery-only shot).
    const images = [form.hoverImage, form.thirdImage].filter(Boolean);

    const payload = {
      name: form.name,
      categorySlug: form.categorySlug,
      price: parseFloat(form.price),
      compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
      image: form.image,
      images,
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

  function updateRegionalField(code: string, field: "price" | "compareAtPrice", value: string) {
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
        <div className="relative">
          <button
            onClick={() => setAddMenuOpen((v) => !v)}
            className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02]"
          >
            <Plus size={16} /> Add Product
          </button>
          {addMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setAddMenuOpen(false)} />
              <div className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    openAdd();
                  }}
                  className="block w-full px-4 py-3 text-left font-body text-sm text-ink hover:bg-surface2"
                >
                  <span className="block">Single Product</span>
                  <span className="block font-mono text-[10px] text-muted">Full details, one at a time</span>
                </button>
                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    router.push("/admin/products/bulk-import");
                  }}
                  className="block w-full border-t border-white/5 px-4 py-3 text-left font-body text-sm text-ink hover:bg-surface2"
                >
                  <span className="block">Bulk Upload</span>
                  <span className="block font-mono text-[10px] text-muted">Import many at once from a folder</span>
                </button>
              </div>
            </>
          )}
        </div>
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

      {/* Card grid — image-forward, readable at a glance, same layout logic on mobile and desktop (just fewer columns) */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((p) => {
          const cat = categories.find((c) => c.slug === p.categorySlug);
          const outOfStock = p.stock === 0;
          const lowStock = p.stock > 0 && p.stock <= 5;
          return (
            <div
              key={p.id}
              className="group overflow-hidden rounded-2xl border border-white/5 bg-surface transition-colors hover:border-white/10"
            >
              <div className="relative aspect-square bg-surface2">
                <Image src={p.image} alt={p.name} fill sizes="(max-width: 640px) 50vw, 240px" className="object-cover" />

                <div className="absolute left-2 top-2 flex flex-col gap-1">
                  {p.isNew && (
                    <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] font-semibold uppercase text-bg">
                      New
                    </span>
                  )}
                  {p.isSpotlight && (
                    <span className="flex items-center gap-0.5 rounded-full bg-accent2 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase text-ink">
                      <Star size={8} className="fill-current" /> Spotlight
                    </span>
                  )}
                </div>

                {(outOfStock || lowStock) && (
                  <span
                    className={cn(
                      "absolute bottom-2 left-2 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase backdrop-blur-sm",
                      outOfStock ? "bg-accent2/90 text-ink" : "bg-bg/80 text-accent"
                    )}
                  >
                    {outOfStock ? "Out of stock" : `${p.stock} left`}
                  </span>
                )}

                {/* Actions: always visible on touch devices (no hover), fade in on desktop hover */}
                <div className="absolute right-2 top-2 flex gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(p)}
                    aria-label="Edit"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-bg/85 text-ink backdrop-blur-sm hover:text-accent"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    aria-label="Delete"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-bg/85 text-ink backdrop-blur-sm hover:text-accent2"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="p-2.5 sm:p-3">
                <p className="truncate font-body text-xs text-ink sm:text-sm">{p.name}</p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-muted">{cat?.name ?? p.categorySlug}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-mono text-xs text-ink sm:text-sm">{formatBasePriceINR(p.price)}</span>
                  {(p.colors?.length || p.sizes?.length) ? (
                    <span className="font-mono text-[9px] text-muted">
                      {p.colors?.length ? `${p.colors.length}c` : ""}
                      {p.colors?.length && p.sizes?.length ? " · " : ""}
                      {p.sizes?.length ? `${p.sizes.length}s` : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-14 text-center font-body text-sm text-muted">No products match your filters.</p>
        )}
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
                      <label className="mb-1.5 block font-body text-xs text-muted">Price (₹ INR — base price)</label>
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
                      <label className="mb-1.5 block font-body text-xs text-muted">Compare-at price (₹ INR)</label>
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
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="font-body text-xs text-muted">Product images</p>
                      {(form.image || form.hoverImage || form.thirdImage) && (
                        <p className="font-mono text-[9px] text-muted">
                          {selectedImageSlot ? "Tap another slot to swap" : "Tap or drag to rearrange"}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <ImageSlot
                        label="Main"
                        required
                        hint="Shown on the product card and as the default gallery image."
                        value={form.image}
                        uploading={uploadingSlot === "image"}
                        onUpload={(f) => handleSlotUpload("image", f)}
                        onClear={() => setForm((f) => ({ ...f, image: "" }))}
                        {...imageSlotProps("image")}
                      />
                      <ImageSlot
                        label="Hover"
                        hint="Flashes in when a shopper hovers the product card."
                        value={form.hoverImage}
                        uploading={uploadingSlot === "hoverImage"}
                        onUpload={(f) => handleSlotUpload("hoverImage", f)}
                        onClear={() => setForm((f) => ({ ...f, hoverImage: "" }))}
                        {...imageSlotProps("hoverImage")}
                      />
                      <ImageSlot
                        label="Third"
                        hint="Extra shot shown only in the product page gallery."
                        value={form.thirdImage}
                        uploading={uploadingSlot === "thirdImage"}
                        onUpload={(f) => handleSlotUpload("thirdImage", f)}
                        onClear={() => setForm((f) => ({ ...f, thirdImage: "" }))}
                        {...imageSlotProps("thirdImage")}
                      />
                    </div>
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
                    Set exact prices per currency — these override the auto-converted price whenever a customer
                    views the site in that currency. Leave blank to auto-estimate from the base ₹ price using the
                    site&apos;s configured conversion rate (Settings → Currencies).
                  </p>
                  {regionalCurrencies.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 bg-bg p-4 font-body text-xs text-muted">
                      No currencies configured yet. Add one under Settings → Currencies to set regional prices here.
                    </p>
                  ) : (
                    regionalCurrencies.map((c) => (
                      <div key={c.code} className="rounded-xl border border-white/10 bg-bg p-3">
                        <p className="mb-2 font-mono text-xs text-accent">
                          {c.code} <span className="text-muted">({c.symbol})</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={form.regionalPrices[c.code]?.price ?? ""}
                            onChange={(e) => updateRegionalField(c.code, "price", e.target.value)}
                            className="rounded-lg border border-white/10 bg-surface px-3 py-1.5 font-mono text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Compare-at (optional)"
                            value={form.regionalPrices[c.code]?.compareAtPrice ?? ""}
                            onChange={(e) => updateRegionalField(c.code, "compareAtPrice", e.target.value)}
                            className="rounded-lg border border-white/10 bg-surface px-3 py-1.5 font-mono text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                          />
                        </div>
                      </div>
                    ))
                  )}
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