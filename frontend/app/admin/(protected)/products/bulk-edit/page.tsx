"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  Search,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { fetchCategories, type Category } from "@/src/lib/categories";
import { fetchProducts, bulkUpdateProducts, deleteProduct } from "@/src/lib/products";
import { uploadMedia, deleteMedia } from "@/src/lib/media";
import { useToastStore } from "@/src/hooks/useToastStore";
import { estimateProductShipping } from "@/src/lib/shipping";
import { Product } from "@/src/types";
import { cn } from "@/src/lib/utils";
import ImageLightbox from "@/components/admin/ImageLightbox";

const BULK_DELETE_CHUNK_SIZE = 4;

type EditableField =
  | "name"
  | "categorySlug"
  | "price"
  | "compareAtPrice"
  | "stock"
  | "weight"
  | "rating"
  | "isNew"
  | "isSpotlight";

interface GridRow {
  id: string;
  name: string;
  categorySlug: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  weight: string;
  image: string;
  hoverImage: string;
  thirdImage: string;
  isNew: boolean;
  isSpotlight: boolean;
  rating: string;
  hasVariants: boolean;
}

function productToRow(p: Product): GridRow {
  return {
    id: p.id,
    name: p.name,
    categorySlug: p.categorySlug,
    price: String(p.price),
    compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "",
    stock: String(p.stock),
    weight: String(p.weight ?? 0.3),
    image: p.image,
    hoverImage: p.images?.[0] ?? "",
    thirdImage: p.images?.[1] ?? "",
    isNew: p.isNew,
    isSpotlight: p.isSpotlight,
    rating: String(p.rating),
    hasVariants: (p.colors?.length ?? 0) > 0 || (p.sizes?.length ?? 0) > 0,
  };
}

const ALL_FIELDS: (keyof GridRow)[] = [
  "name", "categorySlug", "price", "compareAtPrice", "stock", "weight",
  "image", "hoverImage", "thirdImage", "isNew", "isSpotlight", "rating",
];

const COLUMNS: { field: EditableField; label: string; width: string }[] = [
  { field: "name", label: "Name", width: "min-w-[200px]" },
  { field: "categorySlug", label: "Category", width: "min-w-[150px]" },
  { field: "price", label: "Price (₹)", width: "min-w-[110px]" },
  { field: "compareAtPrice", label: "Compare-at (₹)", width: "min-w-[130px]" },
  { field: "stock", label: "Stock", width: "min-w-[90px]" },
  { field: "weight", label: "Weight (kg)", width: "min-w-[110px]" },
  { field: "isNew", label: "New", width: "min-w-[70px]" },
  { field: "isSpotlight", label: "Spotlight", width: "min-w-[90px]" },
  { field: "rating", label: "Rating", width: "min-w-[90px]" },
];

// Checkbox column (40px) + image column (88px) — kept in sync with the
// `left-*` offsets on the sticky <th>/<td> pair below, so the image column
// tucks in flush against the checkbox column regardless of viewport.
const CHECKBOX_COL_WIDTH = 40;

export default function BulkEditProductsPage() {
  const showToast = useToastStore((s) => s.show);

  const [categories, setCategories] = useState<Category[]>([]);
  const [original, setOriginal] = useState<Record<string, GridRow>>({});
  const [rows, setRows] = useState<Record<string, GridRow>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [flagFilter, setFlagFilter] = useState<"all" | "new" | "spotlight">("all");
  const [unsavedOnly, setUnsavedOnly] = useState(false);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [selectedColumn, setSelectedColumn] = useState<EditableField | null>(null);
  const [fillValue, setFillValue] = useState("");

  const [editingCell, setEditingCell] = useState<{ id: string; field: EditableField } | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [uploadingCell, setUploadingCell] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ done: 0, total: 0 });

  const pendingUploadsRef = useRef<{ url: string; path: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([fetchProducts(), fetchCategories()]);
        if (cancelled) return;
        const rowMap: Record<string, GridRow> = {};
        const ids: string[] = [];
        productsData.forEach((p) => {
          rowMap[p.id] = productToRow(p);
          ids.push(p.id);
        });
        setOriginal(rowMap);
        setRows(rowMap);
        setOrder(ids);
        setCategories(categoriesData);
      } catch (err) {
        if (!cancelled) showToast(err instanceof Error ? err.message : "Failed to load products", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const dirtyIds = useMemo(() => {
    const set = new Set<string>();
    order.forEach((id) => {
      const a = original[id];
      const b = rows[id];
      if (!a || !b) return;
      if (ALL_FIELDS.some((f) => a[f] !== b[f])) set.add(id);
    });
    return set;
  }, [rows, original, order]);

  const filteredIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return order.filter((id) => {
      const row = rows[id];
      if (!row) return false;
      if (unsavedOnly && !dirtyIds.has(id)) return false;
      if (q && !row.name.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && row.categorySlug !== categoryFilter) return false;
      const stockNum = parseInt(row.stock || "0", 10);
      if (stockFilter === "in" && stockNum <= 5) return false;
      if (stockFilter === "low" && !(stockNum > 0 && stockNum <= 5)) return false;
      if (stockFilter === "out" && stockNum !== 0) return false;
      if (flagFilter === "new" && !row.isNew) return false;
      if (flagFilter === "spotlight" && !row.isSpotlight) return false;
      return true;
    });
  }, [order, rows, search, categoryFilter, stockFilter, flagFilter, unsavedOnly, dirtyIds]);

  function updateField(id: string, field: keyof GridRow, value: string | boolean) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function applyColumnFill() {
    if (!selectedColumn || fillValue === "") return;
    const isBoolField = selectedColumn === "isNew" || selectedColumn === "isSpotlight";
    const boolValue = fillValue === "true";
    setRows((prev) => {
      const next = { ...prev };
      filteredIds.forEach((id) => {
        const row = next[id];
        if (!row) return;
        if (selectedColumn === "stock" && row.hasVariants) return;
        next[id] = { ...row, [selectedColumn]: isBoolField ? boolValue : fillValue };
      });
      return next;
    });
    showToast(`Applied to ${filteredIds.length} product${filteredIds.length !== 1 ? "s" : ""}`);
    setSelectedColumn(null);
    setFillValue("");
  }

  async function handleCellImageUpload(id: string, slot: "image" | "hoverImage" | "thirdImage", file: File | undefined) {
    if (!file) return;
    const key = `${id}:${slot}`;
    setUploadingCell(key);
    try {
      const { url, path } = await uploadMedia(file);
      pendingUploadsRef.current.push({ url, path });
      updateField(id, slot, url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploadingCell(null);
    }
  }

  function buildPayload(row: GridRow, changedFields: (keyof GridRow)[]): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (changedFields.includes("name")) payload.name = row.name;
    if (changedFields.includes("categorySlug")) payload.categorySlug = row.categorySlug;
    if (changedFields.includes("price")) payload.price = parseFloat(row.price || "0");
    if (changedFields.includes("compareAtPrice")) {
      payload.compareAtPrice = row.compareAtPrice ? parseFloat(row.compareAtPrice) : null;
    }
    if (changedFields.includes("weight")) payload.weight = parseFloat(row.weight || "0.3");
    if (!row.hasVariants && changedFields.includes("stock")) payload.stock = parseInt(row.stock || "0", 10);
    if (changedFields.includes("image")) payload.image = row.image;
    if (changedFields.includes("hoverImage") || changedFields.includes("thirdImage")) {
      payload.images = [row.hoverImage, row.thirdImage].filter(Boolean);
    }
    if (changedFields.includes("isNew")) payload.isNew = row.isNew;
    if (changedFields.includes("isSpotlight")) payload.isSpotlight = row.isSpotlight;
    if (changedFields.includes("rating")) payload.rating = parseFloat(row.rating || "4.5");
    return payload;
  }

  async function handleSaveAll() {
    const ids = Array.from(dirtyIds);
    if (ids.length === 0) return;
    setSaving(true);
    setSaveProgress({ done: 0, total: ids.length });

    const items = ids.map((id) => {
      const a = original[id];
      const b = rows[id];
      const changed = ALL_FIELDS.filter((f) => a[f] !== b[f]);
      return { id, updates: buildPayload(b, changed) };
    });

    const result = await bulkUpdateProducts(items, (done, total) => setSaveProgress({ done, total }));

    if (result.updated.length > 0) {
      setOriginal((prev) => {
        const next = { ...prev };
        result.updated.forEach((p) => { next[p.id] = productToRow(p); });
        return next;
      });
      setRows((prev) => {
        const next = { ...prev };
        result.updated.forEach((p) => { next[p.id] = productToRow(p); });
        return next;
      });
    }

    const referenced = new Set<string>();
    Object.values(rows).forEach((r) => {
      [r.image, r.hoverImage, r.thirdImage].forEach((u) => u && referenced.add(u));
    });
    const leftover = pendingUploadsRef.current.filter((u) => !referenced.has(u.url));
    pendingUploadsRef.current = pendingUploadsRef.current.filter((u) => referenced.has(u.url));
    leftover.forEach((u) => deleteMedia(u.path));

    setSaving(false);

    if (result.errors.length === 0) {
      showToast(`${result.updated.length} product${result.updated.length !== 1 ? "s" : ""} saved`);
    } else {
      showToast(`${result.updated.length} saved, ${result.errors.length} failed — check those rows and retry`, "error");
    }
  }

  function handleDiscardAll() {
    pendingUploadsRef.current.forEach((u) => deleteMedia(u.path));
    pendingUploadsRef.current = [];
    setRows(original);
    showToast("Unsaved changes discarded", "info");
  }

  function toggleRowSelected(id: string) {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteSingleRow(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    try {
      await deleteProduct(id);
      setRows((prev) => { const next = { ...prev }; delete next[id]; return next; });
      setOriginal((prev) => { const next = { ...prev }; delete next[id]; return next; });
      setOrder((prev) => prev.filter((x) => x !== id));
      setSelectedRowIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      showToast("Product deleted", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete product", "error");
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedRowIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} product${ids.length !== 1 ? "s" : ""}? This can't be undone.`)) return;

    setBulkDeleting(true);
    setDeleteProgress({ done: 0, total: ids.length });
    let failed = 0;

    for (let i = 0; i < ids.length; i += BULK_DELETE_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + BULK_DELETE_CHUNK_SIZE);
      const results = await Promise.allSettled(chunk.map((id) => deleteProduct(id)));
      const succeeded = chunk.filter((_, idx) => results[idx].status === "fulfilled");
      failed += chunk.length - succeeded.length;

      if (succeeded.length > 0) {
        setRows((prev) => { const next = { ...prev }; succeeded.forEach((id) => delete next[id]); return next; });
        setOriginal((prev) => { const next = { ...prev }; succeeded.forEach((id) => delete next[id]); return next; });
        setOrder((prev) => prev.filter((id) => !succeeded.includes(id)));
      }
      setDeleteProgress((prev) => ({ ...prev, done: prev.done + chunk.length }));
    }

    setBulkDeleting(false);
    setSelectedRowIds(new Set());
    if (failed === 0) {
      showToast(`${ids.length} product${ids.length !== 1 ? "s" : ""} deleted`, "info");
    } else {
      showToast(`${ids.length - failed} deleted, ${failed} failed`, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  const anyFloatingBar = selectedRowIds.size > 0 || dirtyIds.size > 0;

  return (
    <div className={cn("pb-6", anyFloatingBar && "pb-32")}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="shrink-0 text-muted hover:text-ink" aria-label="Back to Products">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Bulk Edit</h1>
            <p className="mt-1 font-body text-sm text-muted">
              {order.length} products
              {dirtyIds.size > 0 && (
                <span className="text-accent"> · {dirtyIds.size} unsaved change{dirtyIds.size !== 1 ? "s" : ""}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full border border-white/10 bg-surface px-4 py-2.5">
          <Search size={15} className="shrink-0 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
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
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
          className="rounded-full border border-white/10 bg-surface px-4 py-2.5 font-body text-sm text-ink focus:outline-none"
        >
          <option value="all">All stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock (≤5)</option>
          <option value="out">Out of stock</option>
        </select>
        <select
          value={flagFilter}
          onChange={(e) => setFlagFilter(e.target.value as typeof flagFilter)}
          className="rounded-full border border-white/10 bg-surface px-4 py-2.5 font-body text-sm text-ink focus:outline-none"
        >
          <option value="all">New & Spotlight</option>
          <option value="new">New only</option>
          <option value="spotlight">Spotlight only</option>
        </select>
        <button
          type="button"
          onClick={() => setUnsavedOnly((v) => !v)}
          disabled={dirtyIds.size === 0 && !unsavedOnly}
          className={cn(
            "rounded-full border px-4 py-2.5 font-body text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            unsavedOnly ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-ink"
          )}
        >
          Unsaved only
        </button>
        <span className="ml-auto font-mono text-xs text-muted">{filteredIds.length} shown</span>
      </div>

      {/* Column-fill toolbar — appears once a column header is clicked */}
      {selectedColumn && (
        <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-2xl border border-accent/40 bg-accent/[0.07] px-4 py-3">
          <span className="rounded-full bg-accent/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-accent">
            {COLUMNS.find((c) => c.field === selectedColumn)?.label}
          </span>
          <span className="font-body text-xs text-muted">
            → set for {filteredIds.length} shown product{filteredIds.length !== 1 ? "s" : ""}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {selectedColumn === "isNew" || selectedColumn === "isSpotlight" ? (
              <select
                value={fillValue}
                onChange={(e) => setFillValue(e.target.value)}
                className="rounded-lg border border-white/10 bg-bg px-3 py-1.5 font-body text-xs text-ink focus:outline-none"
              >
                <option value="">Choose…</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : selectedColumn === "categorySlug" ? (
              <select
                value={fillValue}
                onChange={(e) => setFillValue(e.target.value)}
                className="rounded-lg border border-white/10 bg-bg px-3 py-1.5 font-body text-xs text-ink focus:outline-none"
              >
                <option value="">Choose…</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            ) : (
              <input
                autoFocus
                value={fillValue}
                onChange={(e) => setFillValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyColumnFill()}
                placeholder="Value"
                className="w-32 rounded-lg border border-white/10 bg-bg px-3 py-1.5 font-mono text-xs text-ink focus:outline-none focus:border-accent/50"
              />
            )}
            <button
              onClick={applyColumnFill}
              disabled={fillValue === ""}
              className="rounded-full bg-accent px-4 py-1.5 font-body text-xs font-semibold text-bg disabled:opacity-50"
            >
              Apply to all
            </button>
            <button
              onClick={() => { setSelectedColumn(null); setFillValue(""); }}
              className="rounded-full border border-white/10 px-3 py-1.5 font-body text-xs text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---------------- MOBILE: card list (below md) ---------------- */}
      <div className="mt-4 space-y-3 md:hidden">
        {filteredIds.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 bg-surface p-10 text-center font-body text-sm text-muted">
            No products match your filters.
          </p>
        )}
        {filteredIds.map((id) => {
          const row = rows[id];
          const isDirty = dirtyIds.has(id);
          const isSelected = selectedRowIds.has(id);
          const shipping = estimateProductShipping(parseFloat(row.weight) || 0);
          return (
            <div
              key={id}
              className={cn(
                "rounded-2xl border bg-surface p-4 transition-colors",
                isSelected ? "border-accent ring-1 ring-inset ring-accent" : isDirty ? "border-accent/40" : "border-white/5"
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleRowSelected(id)}
                  className="mt-1.5 h-5 w-5 shrink-0 rounded border-white/10 accent-[var(--color-accent)]"
                />

                <div className="flex shrink-0 gap-1.5">
                  {(["image", "hoverImage", "thirdImage"] as const).map((slot) => {
                    const value = row[slot];
                    const cellKey = `${id}:${slot}`;
                    return (
                      <div key={slot} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-surface2">
                        {value ? (
                          <button type="button" onClick={() => setLightbox({ src: value, alt: row.name })} className="relative block h-full w-full">
                            <Image src={value} alt={row.name} fill sizes="56px" className="object-cover" />
                          </button>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted">
                            <UploadCloud size={14} />
                          </div>
                        )}
                        <label className="absolute inset-x-0 bottom-0 flex h-5 cursor-pointer items-center justify-center bg-bg/85 text-[9px] text-muted">
                          {uploadingCell === cellKey ? <Loader2 size={10} className="animate-spin" /> : "Edit"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              handleCellImageUpload(id, slot, file);
                            }}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleDeleteSingleRow(id, row.name)}
                  aria-label="Delete product"
                  className="ml-auto shrink-0 text-muted hover:text-accent2"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <input
                value={row.name}
                onChange={(e) => updateField(id, "name", e.target.value)}
                className="mt-3 w-full rounded-lg border border-white/10 bg-bg px-3 py-2 font-body text-sm font-medium text-ink focus:outline-none focus:border-accent/50"
              />

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-muted">Category</label>
                  <select
                    value={row.categorySlug}
                    onChange={(e) => updateField(id, "categorySlug", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-bg px-2.5 py-2 font-body text-xs text-ink focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-muted">
                    Stock {row.hasVariants && "(auto)"}
                  </label>
                  <input
                    disabled={row.hasVariants}
                    value={row.stock}
                    onChange={(e) => updateField(id, "stock", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-bg px-2.5 py-2 font-mono text-xs text-ink focus:outline-none disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-muted">Price (₹)</label>
                  <input
                    value={row.price}
                    onChange={(e) => updateField(id, "price", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-bg px-2.5 py-2 font-mono text-xs text-ink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-muted">Compare-at (₹)</label>
                  <input
                    value={row.compareAtPrice}
                    onChange={(e) => updateField(id, "compareAtPrice", e.target.value)}
                    placeholder="—"
                    className="w-full rounded-lg border border-white/10 bg-bg px-2.5 py-2 font-mono text-xs text-ink placeholder:text-muted focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-muted">Weight (kg)</label>
                  <input
                    value={row.weight}
                    onChange={(e) => updateField(id, "weight", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-bg px-2.5 py-2 font-mono text-xs text-ink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-muted">Rating</label>
                  <input
                    value={row.rating}
                    onChange={(e) => updateField(id, "rating", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-bg px-2.5 py-2 font-mono text-xs text-ink focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg border border-white/5 bg-bg px-3 py-2 font-mono text-[11px] text-muted">
                <span>Est. shipping</span>
                <span className="text-ink">PB ₹{shipping.punjab} · IN ₹{shipping.india}</span>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <label className="flex items-center gap-1.5 font-body text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={row.isNew}
                    onChange={(e) => updateField(id, "isNew", e.target.checked)}
                    className="h-4 w-4 rounded border-white/10 accent-[var(--color-accent)]"
                  />
                  New
                </label>
                <label className="flex items-center gap-1.5 font-body text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={row.isSpotlight}
                    onChange={(e) => updateField(id, "isSpotlight", e.target.checked)}
                    className="h-4 w-4 rounded border-white/10 accent-[var(--color-accent)]"
                  />
                  <Star size={11} className={row.isSpotlight ? "fill-accent2 text-accent2" : "text-muted"} /> Spotlight
                </label>
                {isDirty && (
                  <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Unsaved
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <p className="pt-1 text-center font-body text-[11px] text-muted">
          Column fill (set one value across many products at once) is available on a larger screen.
        </p>
      </div>

      {/* ---------------- DESKTOP: spreadsheet table (md and up) ---------------- */}
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
        <table className="w-full min-w-[1400px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th
                className="sticky left-0 z-20 bg-surface p-3 text-left"
                style={{ width: CHECKBOX_COL_WIDTH }}
              >
                <input
                  type="checkbox"
                  checked={filteredIds.length > 0 && filteredIds.every((id) => selectedRowIds.has(id))}
                  onChange={(e) => setSelectedRowIds(e.target.checked ? new Set(filteredIds) : new Set())}
                  className="h-4 w-4 rounded border-white/10 accent-[var(--color-accent)]"
                />
              </th>
              <th
                className="sticky z-20 min-w-[192px] bg-surface p-3 text-left font-body text-xs uppercase tracking-wide text-muted"
                style={{ left: CHECKBOX_COL_WIDTH }}
              >
                Images
              </th>
              {COLUMNS.map((col) => {
                const isActive = selectedColumn === col.field;
                return (
                  <th
                    key={col.field}
                    className={cn(
                      "bg-surface p-3 text-left font-body text-xs uppercase tracking-wide transition-colors",
                      col.width,
                      isActive ? "bg-accent/10 text-accent" : "text-muted"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setSelectedColumn(null);
                          setFillValue("");
                        } else {
                          setSelectedColumn(col.field);
                          setFillValue("");
                        }
                      }}
                      className="flex items-center gap-1 hover:text-accent"
                    >
                      {col.label}
                      <ChevronDown size={12} className={cn("transition-transform", isActive && "rotate-180")} />
                    </button>
                  </th>
                );
              })}
              <th className="min-w-[150px] bg-surface p-3 text-left font-body text-xs uppercase tracking-wide text-muted">
                Est. Shipping
              </th>
              <th className="w-12 bg-surface p-3" />
            </tr>
          </thead>
          <tbody>
            {filteredIds.map((id) => {
              const row = rows[id];
              const isDirty = dirtyIds.has(id);
              const isSelected = selectedRowIds.has(id);
              const shipping = estimateProductShipping(parseFloat(row.weight) || 0);
              const rowBg = isSelected ? "bg-accent/10" : isDirty ? "bg-accent/5" : "bg-surface";
              return (
                <tr key={id} className="border-b border-white/5 last:border-b-0">
                  <td className={cn("sticky left-0 z-10 p-3", rowBg)} style={{ width: CHECKBOX_COL_WIDTH }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRowSelected(id)}
                      className="h-4 w-4 rounded border-white/10 accent-[var(--color-accent)]"
                    />
                  </td>
                  <td className={cn("sticky z-10 p-2", rowBg)} style={{ left: CHECKBOX_COL_WIDTH }}>
                    <div className="flex gap-1.5">
                      {(["image", "hoverImage", "thirdImage"] as const).map((slot) => {
                        const value = row[slot];
                        const cellKey = `${id}:${slot}`;
                        return (
                          <div key={slot} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-surface2">
                            {value ? (
                              <button
                                type="button"
                                onClick={() => setLightbox({ src: value, alt: row.name })}
                                className="relative block h-full w-full"
                              >
                                <Image src={value} alt={row.name} fill sizes="48px" className="object-cover" />
                              </button>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted">
                                <UploadCloud size={14} />
                              </div>
                            )}
                            <label className="absolute inset-x-0 bottom-0 flex h-4 cursor-pointer items-center justify-center bg-bg/80 text-[8px] text-muted hover:text-accent">
                              {uploadingCell === cellKey ? <Loader2 size={9} className="animate-spin" /> : "Edit"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = "";
                                  handleCellImageUpload(id, slot, file);
                                }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {COLUMNS.map((col) => {
                    const isEditing = editingCell?.id === id && editingCell.field === col.field;
                    const isColSelected = selectedColumn === col.field;
                    const disabled = col.field === "stock" && row.hasVariants;
                    const cellBg = cn(rowBg, isColSelected && "bg-accent/10");

                    if (col.field === "isNew" || col.field === "isSpotlight") {
                      return (
                        <td key={col.field} className={cn("p-3", cellBg)}>
                          <input
                            type="checkbox"
                            checked={row[col.field] as boolean}
                            onChange={(e) => updateField(id, col.field, e.target.checked)}
                            className="h-4 w-4 rounded border-white/10 accent-[var(--color-accent)]"
                          />
                        </td>
                      );
                    }

                    if (col.field === "categorySlug") {
                      return (
                        <td key={col.field} className={cn("p-2", cellBg)}>
                          <select
                            value={row.categorySlug}
                            onChange={(e) => updateField(id, "categorySlug", e.target.value)}
                            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-body text-xs text-ink hover:border-white/10 focus:outline-none focus:border-accent/50"
                          >
                            {categories.map((c) => (
                              <option key={c.slug} value={c.slug}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.field}
                        className={cn("p-2", cellBg)}
                        onClick={() => !disabled && setEditingCell({ id, field: col.field })}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            defaultValue={row[col.field] as string}
                            onBlur={(e) => { updateField(id, col.field, e.target.value); setEditingCell(null); }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-full rounded-lg border border-accent/60 bg-bg px-2 py-1.5 font-mono text-xs text-ink focus:outline-none"
                          />
                        ) : (
                          <div
                            className={cn(
                              "min-h-[30px] rounded-lg border border-transparent px-2 py-1.5 font-mono text-xs text-ink",
                              disabled ? "opacity-40" : "cursor-text hover:border-white/10 hover:bg-white/5"
                            )}
                          >
                            {(row[col.field] as string) || <span className="text-muted">—</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className={cn("p-3 font-mono text-[11px] text-muted", rowBg)}>
                    PB ₹{shipping.punjab} · IN ₹{shipping.india}
                  </td>

                  <td className={cn("p-2 text-center", rowBg)}>
                    <button
                      onClick={() => handleDeleteSingleRow(id, row.name)}
                      aria-label="Delete row"
                      className="text-muted hover:text-accent2"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredIds.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 4} className="p-10 text-center font-body text-sm text-muted">
                  No products match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating action bars — stack vertically so they never overlap, on
          either viewport. */}
      {anyFloatingBar && (
        <div className="fixed inset-x-0 bottom-4 z-[95] flex flex-col items-center gap-2 px-4">
          {selectedRowIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl"
            >
              {bulkDeleting ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-body text-xs text-muted">
                    <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Deleting…</span>
                    <span className="font-mono">{deleteProgress.done}/{deleteProgress.total}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${deleteProgress.total ? (deleteProgress.done / deleteProgress.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="font-body text-sm text-ink">{selectedRowIds.size} selected</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedRowIds(new Set())} className="rounded-full border border-white/10 px-3 py-1.5 font-body text-xs text-muted hover:text-ink">Cancel</button>
                    <button onClick={handleBulkDelete} className="flex items-center gap-1.5 rounded-full bg-accent2 px-4 py-1.5 font-body text-xs font-semibold text-ink">
                      <Trash2 size={13} /> Delete Selected
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {dirtyIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-accent/40 bg-surface p-4 shadow-2xl"
            >
              {saving ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-body text-xs text-muted">
                    <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Saving…</span>
                    <span className="font-mono">{saveProgress.done}/{saveProgress.total}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${saveProgress.total ? (saveProgress.done / saveProgress.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="font-body text-sm text-ink">{dirtyIds.size} unsaved change{dirtyIds.size !== 1 ? "s" : ""}</span>
                  <div className="flex gap-2">
                    <button onClick={handleDiscardAll} className="rounded-full border border-white/10 px-3 py-1.5 font-body text-xs text-muted hover:text-ink">Discard</button>
                    <button onClick={handleSaveAll} className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 font-body text-xs font-semibold text-bg">
                      <Check size={13} /> Save All
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
}