"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { ColorOption, VariantStockEntry } from "@/src/types";
import { uploadMedia } from "@/src/lib/media";

interface Props {
  colors: ColorOption[];
  sizes: string[];
  variantStock: VariantStockEntry[];
  onChange: (data: { colors: ColorOption[]; sizes: string[]; variantStock: VariantStockEntry[] }) => void;
  /** Called after every successful upload so the parent can clean it up if the modal is abandoned. */
  onMediaUploaded?: (url: string, path: string) => void;
}

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

export default function VariantsEditor({ colors, sizes, variantStock, onChange, onMediaUploaded }: Props) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadingVideoIndex, setUploadingVideoIndex] = useState<number | null>(null);

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

  function addColor() {
    updateColors([...colors, { name: `Color ${colors.length + 1}`, hex: "#888888", images: [], video: "" }]);
  }
  function removeColor(index: number) {
    updateColors(colors.filter((_, i) => i !== index));
  }
  function editColor(index: number, updates: Partial<ColorOption>) {
    updateColors(colors.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  }

  async function handleImageUpload(index: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingIndex(index);
    setUploadError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        // eslint-disable-next-line no-await-in-loop
        const { url, path } = await uploadMedia(file);
        uploaded.push(url);
        onMediaUploaded?.(url, path);
      }
      editColor(index, { images: [...colors[index].images, ...uploaded] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingIndex(null);
    }
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
      {/* Colors */}
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

              <div className="mt-2 flex items-start gap-2">
                <textarea
                  value={color.images.join("\n")}
                  onChange={(e) => editColor(i, { images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Image URLs, one per line"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-white/10 bg-surface px-3 py-1.5 font-body text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-surface px-2.5 py-1.5 font-body text-[11px] text-muted hover:text-accent">
                  {uploadingIndex === i ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      handleImageUpload(i, files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

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

      {/* Sizes */}
      <div>
        <label className="mb-1.5 block font-body text-xs text-muted">Sizes (comma separated, optional)</label>
        <input
          value={sizes.join(", ")}
          onChange={(e) => updateSizes(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          placeholder="S, M, L, XL"
          className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
        />
      </div>

      {/* Stock matrix */}
      {(colors.length > 0 || sizes.length > 0) && (
        <div>
          <label className="mb-2 block font-body text-xs text-muted">Stock per variant</label>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-bg">
                  <th className="p-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted">Size \ Color</th>
                  {colorNamesForMatrix.map((cn) => (
                    <th key={cn} className="p-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted">{cn}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeListForMatrix.map((sz) => (
                  <tr key={sz} className="border-t border-white/5">
                    <td className="p-2 font-mono text-xs text-ink">{sz}</td>
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
    </div>
  );
}