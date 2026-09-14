"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowRight, Crop, Loader2, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { ColorOption, VariantStockEntry } from "@/src/types";
import { uploadMedia } from "@/src/lib/media";
import { cn } from "@/src/lib/utils";
import ImageCropModal from "@/components/admin/ImageCropModal";

interface Props {
  colors: ColorOption[];
  sizes: string[];
  variantStock: VariantStockEntry[];
  onChange: (data: { colors: ColorOption[]; sizes: string[]; variantStock: VariantStockEntry[] }) => void;
  onMediaUploaded?: (url: string, path: string) => void;
}

const APPAREL_SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

// Common numeric size ranges people reach for a lot (shoe sizing systems).
// These just pre-fill the generic From/To range generator below — they're
// shortcuts, not a separate code path, so any other range (e.g. 40 to 45,
// 41 to 45, 28 to 38…) works the exact same way by typing it in directly.
const NUMERIC_RANGE_SHORTCUTS = [
  { label: "EU 36–46", from: 36, to: 46 },
  { label: "UK 3–11", from: 3, to: 11 },
  { label: "US 5–13", from: 5, to: 13 },
];

const MAX_RANGE_SPAN = 100; // safety guard against fat-fingering a huge range
const MAX_IMAGES_PER_COLOR = 6;

function rebuildMatrix(colors: ColorOption[], sizes: string[], existing: VariantStockEntry[]): VariantStockEntry[] {
  const colorNames = colors.length > 0 ? colors.map((c) => c.name) : ["Default"];
  const sizeList = sizes.length > 0 ? sizes : ["One Size"];
  return colorNames.flatMap((color) =>
    sizeList.map((size) => {
      const found = existing.find((v) => v.color === color && v.size === size);
      return { color, size, stock: found?.stock ?? 0 };
    })
  );
}

type CropJob = {
  colorIndex: number;
  src: string;
  fileName: string;
  mimeType: string;
  isBlobUrl: boolean;
  replaceIndex: number | null; // null = append new image; number = recrop existing at that index
};

// Fast size input: tap a preset chip, or type sizes separated by a space,
// comma, or newline — each separator instantly turns the typed text into a
// removable chip. Also accepts pasted comma/space separated lists in one go.
function SizesEditor({ sizes, onChange }: { sizes: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  function addMany(raw: string) {
    const parts = raw
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...sizes];
    for (const p of parts) {
      if (!next.some((s) => s.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
  }

  function removeSize(size: string) {
    onChange(sizes.filter((s) => s !== size));
  }

  // Generalized: works for 40→45, 41→45, 6→13, or any other numeric span —
  // counts up (or down, if entered backwards) and adds every whole number
  // in between as its own chip in one tap.
  function addRange(fromRaw: number | string, toRaw: number | string) {
    const from = typeof fromRaw === "number" ? fromRaw : parseInt(fromRaw, 10);
    const to = typeof toRaw === "number" ? toRaw : parseInt(toRaw, 10);
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    if (end - start > MAX_RANGE_SPAN) return;
    const generated: string[] = [];
    for (let n = start; n <= end; n++) generated.push(String(n));
    addMany(generated.join(" "));
  }

  function handleAddRangeClick() {
    if (!rangeFrom || !rangeTo) return;
    addRange(rangeFrom, rangeTo);
    setRangeFrom("");
    setRangeTo("");
  }

  function togglePreset(size: string) {
    if (sizes.some((s) => s.toLowerCase() === size.toLowerCase())) removeSize(size);
    else onChange([...sizes, size]);
  }

  function commitDraft() {
    if (draft.trim()) {
      addMany(draft);
      setDraft("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && sizes.length > 0) {
      removeSize(sizes[sizes.length - 1]);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (/[,\s]/.test(pasted)) {
      e.preventDefault();
      addMany(pasted);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block font-body text-xs text-muted">Sizes (optional)</label>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {APPAREL_SIZE_PRESETS.map((s) => {
          const active = sizes.some((sz) => sz.toLowerCase() === s.toLowerCase());
          return (
            <button
              key={s}
              type="button"
              onClick={() => togglePreset(s)}
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
                active ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-ink"
              )}
            >
              {s}
            </button>
          );
        })}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="font-body text-[10px] text-muted">Numeric range:</span>
        <input
          type="number"
          inputMode="numeric"
          value={rangeFrom}
          onChange={(e) => setRangeFrom(e.target.value)}
          placeholder="40"
          className="w-14 rounded-lg border border-white/10 bg-bg px-2 py-1 font-mono text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
        />
        <span className="font-body text-[10px] text-muted">to</span>
        <input
          type="number"
          inputMode="numeric"
          value={rangeTo}
          onChange={(e) => setRangeTo(e.target.value)}
          placeholder="45"
          className="w-14 rounded-lg border border-white/10 bg-bg px-2 py-1 font-mono text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
        />
        <button
          type="button"
          onClick={handleAddRangeClick}
          disabled={!rangeFrom || !rangeTo}
          className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-body text-[11px] font-semibold text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add range
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {NUMERIC_RANGE_SHORTCUTS.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => addRange(r.from, r.to)}
            className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] text-muted hover:border-accent/40 hover:text-accent"
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-bg px-2.5 py-2 focus-within:border-accent/50">
        {sizes.map((s) => (
          <span
            key={s}
            className="flex items-center gap-1 rounded-full bg-surface2 px-2.5 py-1 font-mono text-[11px] text-ink"
          >
            {s}
            <button type="button" onClick={() => removeSize(s)} className="text-muted hover:text-accent2" aria-label={`Remove ${s}`}>
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          onPaste={handlePaste}
          placeholder={sizes.length === 0 ? "Type a size, hit space…" : "Add another…"}
          className="min-w-[90px] flex-1 bg-transparent font-body text-xs text-ink placeholder:text-muted focus:outline-none"
        />
      </div>
      <p className="mt-1 font-body text-[10px] text-muted">
        Tap a preset, use the numeric range for things like shoe sizes, or type sizes separated by a space — each becomes a chip instantly. No commas needed.
      </p>
    </div>
  );
}

export default function VariantsEditor({ colors, sizes, variantStock, onChange, onMediaUploaded }: Props) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadingVideoIndex, setUploadingVideoIndex] = useState<number | null>(null);
  const [bulkStockValue, setBulkStockValue] = useState("10");

  const [cropQueue, setCropQueue] = useState<CropJob[]>([]);
  const [activeCrop, setActiveCrop] = useState<CropJob | null>(null);

  useEffect(() => {
    if (!activeCrop && cropQueue.length > 0) {
      setActiveCrop(cropQueue[0]);
      setCropQueue((q) => q.slice(1));
    }
  }, [activeCrop, cropQueue]);

  function updateColors(next: ColorOption[]) {
    onChange({ colors: next, sizes, variantStock: rebuildMatrix(next, sizes, variantStock) });
  }
  function updateSizes(next: string[]) {
    onChange({ colors, sizes: next, variantStock: rebuildMatrix(colors, next, variantStock) });
  }
  function updateStock(color: string, size: string, stock: number) {
    onChange({
      colors,
      sizes,
      variantStock: variantStock.map((v) => (v.color === color && v.size === size ? { ...v, stock } : v)),
    });
  }
  function applyBulkStock(predicate: (v: VariantStockEntry) => boolean) {
    const value = parseInt(bulkStockValue || "0", 10) || 0;
    onChange({
      colors,
      sizes,
      variantStock: variantStock.map((v) => (predicate(v) ? { ...v, stock: value } : v)),
    });
  }

  function addColor() {
    updateColors([...colors, { name: `Color ${colors.length + 1}`, hex: "#888888", images: [], video: "" }]);
  }
  function removeColor(index: number) {
    updateColors(colors.filter((_, i) => i !== index));
  }
  function editColor(index: number, updates: Partial<ColorOption>) {
    updateColors(colors.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  }
  function removeColorImage(colorIndex: number, imgIndex: number) {
    editColor(colorIndex, { images: colors[colorIndex].images.filter((_, i) => i !== imgIndex) });
  }

  function handleImageFilesSelected(colorIndex: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    const currentCount = colors[colorIndex]?.images.length ?? 0;
    const available = MAX_IMAGES_PER_COLOR - currentCount;
    if (available <= 0) {
      setUploadError(`Each color can have up to ${MAX_IMAGES_PER_COLOR} images.`);
      return;
    }
    const selectedFiles = Array.from(files).slice(0, available);
    if (selectedFiles.length < files.length) {
      setUploadError(`Only ${MAX_IMAGES_PER_COLOR} images are allowed per color.`);
    }
    const jobs: CropJob[] = selectedFiles.map((file) => ({
      colorIndex,
      src: URL.createObjectURL(file),
      fileName: file.name,
      mimeType: file.type || "image/jpeg",
      isBlobUrl: true,
      replaceIndex: null,
    }));
    setCropQueue((q) => [...q, ...jobs]);
  }

  function openRecrop(colorIndex: number, imgIndex: number, url: string) {
    setCropQueue((q) => [
      ...q,
      { colorIndex, src: url, fileName: `color-${colorIndex}-${imgIndex}.jpg`, mimeType: "image/jpeg", isBlobUrl: false, replaceIndex: imgIndex },
    ]);
  }

  async function handleCropConfirm(file: File) {
    if (!activeCrop) return;
    const { colorIndex, src, isBlobUrl, replaceIndex } = activeCrop;
    if (isBlobUrl) URL.revokeObjectURL(src);
    setActiveCrop(null);

    setUploadingIndex(colorIndex);
    setUploadError(null);
    try {
      const { url, path } = await uploadMedia(file);
      onMediaUploaded?.(url, path);
      setColorsRef.current(colorIndex, replaceIndex, url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingIndex(null);
    }
  }

  // Reads latest `colors` at call time (avoids stale closures across the
  // async gap while a crop/upload is in flight and the queue keeps moving).
  const setColorsRef = { current: (colorIndex: number, replaceIndex: number | null, url: string) => {
    const current = colors[colorIndex];
    if (!current) return;
    const nextImages =
      replaceIndex === null
        ? [...current.images, url]
        : current.images.map((img, i) => (i === replaceIndex ? url : img));
    editColor(colorIndex, { images: nextImages });
  } };

  function handleCropCancel() {
    if (activeCrop?.isBlobUrl) URL.revokeObjectURL(activeCrop.src);
    setActiveCrop(null);
  }

  async function handleVideoUpload(index: number, file: File | undefined) {
    if (!file) return;
    setUploadingVideoIndex(index);
    setUploadError(null);
    try {
      const { url, path } = await uploadMedia(file);
      onMediaUploaded?.(url, path);
      editColor(index, { video: url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingVideoIndex(null);
    }
  }

  const colorNamesForMatrix = colors.length > 0 ? colors.map((c) => c.name) : ["Default"];
  const sizeListForMatrix = sizes.length > 0 ? sizes : ["One Size"];

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="font-body text-xs text-muted">Colors (optional)</label>
          <button type="button" onClick={addColor} className="flex items-center gap-1 font-body text-xs text-accent hover:underline">
            <Plus size={12} /> Add color
          </button>
        </div>
        {uploadError && <p className="mb-2 font-body text-xs text-accent2">{uploadError}</p>}
        <div className="space-y-3">
          {colors.map((color, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-bg p-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => editColor(i, { hex: e.target.value })}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border border-white/10 bg-transparent"
                />
                <input
                  value={color.name}
                  onChange={(e) => editColor(i, { name: e.target.value })}
                  placeholder="Color name"
                  className="flex-1 rounded-lg border border-white/10 bg-surface px-3 py-1.5 font-body text-xs text-ink focus:outline-none focus:border-accent/50"
                />
                <button type="button" onClick={() => removeColor(i)} className="shrink-0 text-muted hover:text-accent2">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {color.images.map((imgUrl, imgIdx) => (
                  <div key={imgUrl + imgIdx} className="group relative aspect-[3/4] w-16 overflow-hidden rounded-lg border border-white/10 bg-surface2">
                    <Image src={imgUrl} alt="" fill sizes="64px" className="object-cover" />
                    <button
                      type="button"
                      onClick={() => openRecrop(i, imgIdx, imgUrl)}
                      className="absolute left-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-bg/80 text-ink hover:text-accent"
                      aria-label="Recrop"
                    >
                      <Crop size={9} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeColorImage(i, imgIdx)}
                      className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-bg/80 text-ink hover:text-accent2"
                      aria-label="Remove"
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
                <label className={cn(
                  "flex aspect-[3/4] w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 bg-bg text-muted hover:border-accent/40 hover:text-accent",
                  color.images.length >= MAX_IMAGES_PER_COLOR ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                )}>
                  {uploadingIndex === i ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                  <span className="font-mono text-[9px] uppercase">{color.images.length >= MAX_IMAGES_PER_COLOR ? "Max" : "Add"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={color.images.length >= MAX_IMAGES_PER_COLOR}
                    onChange={(e) => {
                      handleImageFilesSelected(i, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {color.images.length === 0 && (
                <p className="mt-1 font-body text-[11px] text-muted">No images yet for this color.</p>
              )}

              <div className="mt-2 flex items-center gap-2">
                <input
                  value={color.video ?? ""}
                  onChange={(e) => editColor(i, { video: e.target.value })}
                  placeholder="Video URL (optional)"
                  className="w-full rounded-lg border border-white/10 bg-surface px-3 py-1.5 font-body text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-surface px-2.5 py-1.5 font-body text-[11px] text-muted hover:text-accent">
                  {uploadingVideoIndex === i ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  Upload
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleVideoUpload(i, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
          {colors.length === 0 && <p className="font-body text-xs text-muted">No colors added — product will use its main image only.</p>}
        </div>
      </div>

      <SizesEditor sizes={sizes} onChange={updateSizes} />

      {(colors.length > 0 || sizes.length > 0) && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="font-body text-xs text-muted">Stock per variant</label>
            <div className="flex items-center gap-1.5">
              <span className="font-body text-[11px] text-muted">Quick fill</span>
              <input
                type="number"
                min={0}
                value={bulkStockValue}
                onChange={(e) => setBulkStockValue(e.target.value)}
                className="w-14 rounded-lg border border-white/10 bg-bg px-2 py-1 font-mono text-xs text-ink focus:outline-none focus:border-accent/50"
              />
              <button
                type="button"
                onClick={() => applyBulkStock(() => true)}
                className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-body text-[11px] font-semibold text-accent hover:bg-accent/20"
              >
                Fill all
              </button>
            </div>
          </div>
          <p className="mb-2 font-body text-[10px] text-muted">
            Set a number above, then hit &quot;Fill all&quot;, or use the small arrow buttons on a column/row to fill just that color or size.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-bg">
                  <th className="p-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted">Size \ Color</th>
                  {colorNamesForMatrix.map((cn) => (
                    <th key={cn} className="p-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                      <div className="flex items-center gap-1">
                        <span>{cn}</span>
                        <button
                          type="button"
                          onClick={() => applyBulkStock((v) => v.color === cn)}
                          title={`Fill ${cn} column with ${bulkStockValue}`}
                          className="text-muted hover:text-accent"
                        >
                          <ArrowDown size={11} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeListForMatrix.map((sz) => (
                  <tr key={sz} className="border-t border-white/5">
                    <td className="p-2 font-mono text-xs text-ink">
                      <div className="flex items-center gap-1">
                        <span>{sz}</span>
                        <button
                          type="button"
                          onClick={() => applyBulkStock((v) => v.size === sz)}
                          title={`Fill ${sz} row with ${bulkStockValue}`}
                          className="text-muted hover:text-accent"
                        >
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </td>
                    {colorNamesForMatrix.map((cn) => {
                      const entry = variantStock.find((v) => v.color === cn && v.size === sz);
                      return (
                        <td key={cn} className="p-2">
                          <input
                            type="number"
                            min={0}
                            value={entry?.stock ?? 0}
                            onChange={(e) => updateStock(cn, sz, parseInt(e.target.value || "0", 10))}
                            className="w-16 rounded-lg border border-white/10 bg-bg px-2 py-1 font-mono text-xs text-ink focus:outline-none focus:border-accent/50"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeCrop && (
        <ImageCropModal
          imageSrc={activeCrop.src}
          fileName={activeCrop.fileName}
          mimeType={activeCrop.mimeType}
          aspect={3 / 4}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}