"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { fetchLooks, createLook, updateLook, deleteLook, type LookHotspotInput } from "@/src/lib/looks";
import { fetchProducts } from "@/src/lib/products";
import { uploadMedia } from "@/src/lib/media";
import { useToastStore } from "@/src/hooks/useToastStore";
import { Look, Product } from "@/src/types";
import { cn, formatPrice } from "@/src/lib/utils";

interface EditableHotspot extends LookHotspotInput {
  tempId: string;
}

function newTempId() {
  return `hs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminLooksPage() {
  const [looks, setLooks] = useState<Look[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((s) => s.show);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [image, setImage] = useState("");
  const [active, setActive] = useState(true);
  const [order, setOrder] = useState("0");
  const [hotspots, setHotspots] = useState<EditableHotspot[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [l, p] = await Promise.all([fetchLooks(), fetchProducts()]);
        setLooks(l);
        setProducts(p);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to load", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  function openCreate() {
    setEditingSlug(null);
    setTitle("");
    setSubtitle("");
    setImage("");
    setActive(true);
    setOrder("0");
    setHotspots([]);
    setModalOpen(true);
  }

  function openEdit(look: Look) {
    setEditingSlug(look.slug);
    setTitle(look.title);
    setSubtitle(look.subtitle ?? "");
    setImage(look.image);
    setActive(look.active);
    setOrder(String(look.order));
    setHotspots(
      look.hotspots.map((h) => ({
        tempId: newTempId(),
        productId: h.productId,
        xPercent: h.xPercent,
        yPercent: h.yPercent,
        defaultColor: h.defaultColor,
        defaultSize: h.defaultSize,
        label: h.label,
      }))
    );
    setModalOpen(true);
  }

  async function handleUploadImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadMedia(file);
      setImage(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (draggingId) return; // don't add a new one right after a drag
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    setHotspots((prev) => [
      ...prev,
      { tempId: newTempId(), productId: "", xPercent, yPercent, defaultColor: undefined, defaultSize: undefined },
    ]);
  }

  function updateHotspot(tempId: string, updates: Partial<EditableHotspot>) {
    setHotspots((prev) => prev.map((h) => (h.tempId === tempId ? { ...h, ...updates } : h)));
  }

  function removeHotspot(tempId: string) {
    setHotspots((prev) => prev.filter((h) => h.tempId !== tempId));
  }

  function handleMarkerPointerDown(e: React.PointerEvent, tempId: string) {
    e.stopPropagation();
    setDraggingId(tempId);
  }

  function handleImagePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    updateHotspot(draggingId, { xPercent, yPercent });
  }

  function handleImagePointerUp() {
    setDraggingId(null);
  }

  async function handleSave() {
    if (!title.trim() || !image.trim()) {
      showToast("Title and image are required", "error");
      return;
    }
    const incomplete = hotspots.some((h) => !h.productId);
    if (incomplete) {
      showToast("Assign a product to every hotspot before saving", "error");
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      image: image.trim(),
      active,
      order: parseInt(order || "0", 10),
      hotspots: hotspots.map(({ productId, xPercent, yPercent, defaultColor, defaultSize, label }) => ({
        productId,
        xPercent,
        yPercent,
        defaultColor,
        defaultSize,
        label,
      })),
    };

    try {
      if (editingSlug) {
        const updated = await updateLook(editingSlug, payload);
        setLooks((prev) => prev.map((l) => (l.slug === editingSlug ? updated : l)));
        showToast("Look updated");
      } else {
        const created = await createLook(payload);
        setLooks((prev) => [created, ...prev]);
        showToast("Look created");
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save look", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(look: Look) {
    if (!confirm(`Delete "${look.title}"?`)) return;
    try {
      await deleteLook(look.slug);
      setLooks((prev) => prev.filter((l) => l.id !== look.id));
      showToast("Look deleted", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete", "error");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Shop the Look</h1>
          <p className="mt-1 font-body text-sm text-muted">{looks.length} look{looks.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02]"
        >
          <Plus size={16} /> New Look
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {looks.map((look) => (
          <div key={look.id} className="overflow-hidden rounded-2xl border border-white/5 bg-surface">
            <div className="relative aspect-[3/4] bg-surface2">
              <Image src={look.image} alt={look.title} fill sizes="240px" className="object-cover" />
              {!look.active && (
                <span className="absolute left-2 top-2 rounded-full bg-bg/80 px-2 py-0.5 font-mono text-[9px] uppercase text-muted">
                  Draft
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="truncate font-body text-sm text-ink">{look.title}</p>
              <p className="font-mono text-[10px] text-muted">{look.hotspots.length} item{look.hotspots.length !== 1 ? "s" : ""}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => openEdit(look)} className="flex-1 rounded-lg border border-white/10 py-1.5 font-body text-xs text-ink hover:border-accent/40">
                  Edit
                </button>
                <button onClick={() => handleDelete(look)} className="rounded-lg border border-white/10 px-2.5 text-muted hover:text-accent2">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {looks.length === 0 && (
          <p className="col-span-full py-10 text-center font-body text-sm text-muted">No looks yet — create one to get started.</p>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4" onClick={() => setModalOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">{editingSlug ? "Edit Look" : "New Look"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Subtitle (optional)</label>
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2 font-body text-sm text-ink">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-white/10 bg-bg accent-[var(--color-accent)]" />
                Active (visible on storefront)
              </label>
              <div className="flex items-center gap-2">
                <label className="font-body text-xs text-muted">Order</label>
                <input type="number" value={order} onChange={(e) => setOrder(e.target.value)} className="w-16 rounded-lg border border-white/10 bg-bg px-2 py-1.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50" />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-body text-xs text-muted">Lifestyle photo</label>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-bg px-3 py-1.5 font-body text-xs text-muted hover:text-accent">
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { handleUploadImage(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </div>

              {image ? (
                <div
                  className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-xl border border-white/10 bg-surface2"
                  onClick={handleImageClick}
                  onPointerMove={handleImagePointerMove}
                  onPointerUp={handleImagePointerUp}
                  onPointerLeave={handleImagePointerUp}
                >
                  <Image src={image} alt="" fill sizes="600px" className="pointer-events-none object-cover" />
                  {hotspots.map((h, i) => (
                    <button
                      key={h.tempId}
                      type="button"
                      onPointerDown={(e) => handleMarkerPointerDown(e, h.tempId)}
                      style={{ left: `${h.xPercent}%`, top: `${h.yPercent}%` }}
                      className={cn(
                        "absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 font-mono text-[10px] font-bold shadow-lg active:cursor-grabbing",
                        h.productId ? "border-accent bg-accent/90 text-bg" : "border-accent2 bg-accent2/90 text-bg"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-bg/80 px-3 py-1 font-mono text-[10px] text-muted">
                    Click to place a hotspot · drag markers to reposition
                  </p>
                </div>
              ) : (
                <div className="flex aspect-[4/5] w-full items-center justify-center rounded-xl border border-dashed border-white/10 font-body text-xs text-muted">
                  Upload a photo first
                </div>
              )}
            </div>

            {hotspots.length > 0 && (
              <div className="mt-4 space-y-3">
                <label className="font-body text-xs text-muted">Hotspot products</label>
                {hotspots.map((h, i) => {
                  const product = products.find((p) => p.id === h.productId);
                  return (
                    <div key={h.tempId} className="rounded-xl border border-white/10 bg-bg p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[10px] font-bold text-accent">
                          {i + 1}
                        </span>
                        <select
                          value={h.productId}
                          onChange={(e) => updateHotspot(h.tempId, { productId: e.target.value, defaultColor: undefined, defaultSize: undefined })}
                          className="w-full rounded-lg border border-white/10 bg-surface px-3 py-1.5 font-body text-xs text-ink focus:outline-none focus:border-accent/50"
                        >
                          <option value="">Select a product…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {formatPrice(p.price)}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => removeHotspot(h.tempId)} className="shrink-0 text-muted hover:text-accent2">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {product && (product.colors?.length || product.sizes?.length) ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 pl-8">
                          {!!product.colors?.length && (
                            <select
                              value={h.defaultColor ?? ""}
                              onChange={(e) => updateHotspot(h.tempId, { defaultColor: e.target.value || undefined })}
                              className="rounded-lg border border-white/10 bg-surface px-2 py-1 font-mono text-[11px] text-ink focus:outline-none focus:border-accent/50"
                            >
                              <option value="">Default color…</option>
                              {product.colors.map((c) => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          )}
                          {!!product.sizes?.length && (
                            <select
                              value={h.defaultSize ?? ""}
                              onChange={(e) => updateHotspot(h.tempId, { defaultSize: e.target.value || undefined })}
                              className="rounded-lg border border-white/10 bg-surface px-2 py-1 font-mono text-[11px] text-ink focus:outline-none focus:border-accent/50"
                            >
                              <option value="">Default size…</option>
                              {product.sizes.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:opacity-70"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? "Saving…" : editingSlug ? "Save Changes" : "Create Look"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}