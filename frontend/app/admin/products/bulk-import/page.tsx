"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { FolderOpen, Images, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { fetchCategories, type Category } from "@/src/lib/categories";
import { bulkCreateProducts, type BulkCreateResult } from "@/src/lib/products";
import { uploadMedia } from "@/src/lib/media";
import { useToastStore } from "@/src/hooks/useToastStore";
import { chunkImages, guessCategoryFromFolderName, extractFolderName, type ImageGroup } from "@/src/lib/bulkImport";
import { cn } from "@/src/lib/utils";

const CONCURRENCY = 4;
const SLOT_LABELS = ["Main", "Hover", "Third"] as const;

type SlotRef = { groupIndex: number; slotIndex: number };

function sameSlot(a: SlotRef | null, b: SlotRef | null) {
  return !!a && !!b && a.groupIndex === b.groupIndex && a.slotIndex === b.slotIndex;
}

async function uploadWithConcurrency(
  tasks: { file: File; onDone: (url: string) => void }[],
  concurrency: number,
  onProgress: (done: number, total: number) => void
) {
  let cursor = 0;
  let completed = 0;
  const total = tasks.length;

  async function worker() {
    while (cursor < tasks.length) {
      const idx = cursor++;
      const task = tasks[idx];
      try {
        const { url } = await uploadMedia(task.file);
        task.onDone(url);
      } catch {
        task.onDone("");
      }
      completed++;
      onProgress(completed, total);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
}

export default function BulkImportPage() {
  const showToast = useToastStore((s) => s.show);
  const [categories, setCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [imagesPerProduct, setImagesPerProduct] = useState<1 | 2 | 3>(1);
  const [detectedFolder, setDetectedFolder] = useState<string | null>(null);

  const [categorySlug, setCategorySlug] = useState("");
  const [baseName, setBaseName] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stock, setStock] = useState("0");

  // The rearrangeable grid. Derived from files/imagesPerProduct whenever
  // either changes (a fresh selection or a different grouping size), but
  // otherwise lives as its own state so drag/swap/remove edits persist
  // across re-renders instead of being clobbered by re-chunking.
  const [groups, setGroups] = useState<ImageGroup[]>([]);
  const [skippedGroupIds, setSkippedGroupIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<BulkCreateResult | null>(null);

  // Click-to-select-then-click-to-swap — works with mouse and touch alike,
  // so it's the primary rearrange interaction. Native HTML5 drag-and-drop
  // (below) is layered on top as a desktop convenience; both paths funnel
  // into the same swapSlots() call.
  const [selectedSlot, setSelectedSlot] = useState<SlotRef | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<SlotRef | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<SlotRef | null>(null);
  const dragSourceRef = useRef<SlotRef | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  useMemo(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setGroups(chunkImages(files, imagesPerProduct));
    setSkippedGroupIds(new Set());
    setSelectedSlot(null);
  }, [files, imagesPerProduct]);

  const activeGroups = groups.filter((g) => !skippedGroupIds.has(g.id));

  function resetBatch() {
    setFiles([]);
    setGroups([]);
    setSkippedGroupIds(new Set());
    setResults(null);
    setDetectedFolder(null);
    setSelectedSlot(null);
  }

  function handleFolderSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      showToast("No images found in that folder", "error");
      return;
    }
    setFiles(imageFiles);
    setResults(null);

    const relPath = (fileList[0] as File & { webkitRelativePath?: string }).webkitRelativePath;
    if (relPath) {
      const folderName = extractFolderName(relPath);
      setDetectedFolder(folderName);
      const guessedSlug = guessCategoryFromFolderName(folderName, categories);
      if (guessedSlug) {
        setCategorySlug(guessedSlug);
        showToast(`Category auto-set to match folder "${folderName}"`);
      }
      if (!baseName) setBaseName(folderName.replace(/[-_]+/g, " ").trim());
    }
  }

  function handleImagesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      showToast("No image files in that selection", "error");
      return;
    }
    setFiles(imageFiles);
    setResults(null);
    setDetectedFolder(null);
  }

  function toggleSkip(id: string) {
    setSkippedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Swaps whatever is in slot A with whatever is in slot B — including
  // null. That single symmetric operation covers every case: moving an
  // image into an empty slot leaves the source empty (a plain move),
  // moving between two filled slots exchanges them, and moving within the
  // same product works the same way as moving across two different ones.
  function swapSlots(a: SlotRef, b: SlotRef) {
    if (sameSlot(a, b)) return;
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, images: [...g.images] }));
      const temp = next[a.groupIndex].images[a.slotIndex];
      next[a.groupIndex].images[a.slotIndex] = next[b.groupIndex].images[b.slotIndex];
      next[b.groupIndex].images[b.slotIndex] = temp;
      return next;
    });
  }

  // Clears a single slot on a single product — never touches any other
  // product's images.
  function removeSlotImage(target: SlotRef) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === target.groupIndex
          ? { ...g, images: g.images.map((img, si) => (si === target.slotIndex ? null : img)) }
          : g
      )
    );
    setSelectedSlot((sel) => (sameSlot(sel, target) ? null : sel));
  }

  function handleSlotClick(target: SlotRef) {
    const hasImage = !!groups[target.groupIndex]?.images[target.slotIndex];

    if (!selectedSlot) {
      if (!hasImage) return; // nothing to pick up from an empty slot
      setSelectedSlot(target);
      return;
    }

    if (sameSlot(selectedSlot, target)) {
      setSelectedSlot(null); // clicked the same slot again — deselect
      return;
    }

    swapSlots(selectedSlot, target);
    setSelectedSlot(null);
  }

  function handleDragStart(e: React.DragEvent, source: SlotRef) {
    if (!groups[source.groupIndex]?.images[source.slotIndex]) {
      e.preventDefault();
      return;
    }
    dragSourceRef.current = source;
    setDraggingSlot(source);
    e.dataTransfer.effectAllowed = "move";
    // Firefox requires setData to be called for the drag to actually start.
    e.dataTransfer.setData("text/plain", "image-slot");
  }

  function handleDragOver(e: React.DragEvent, target: SlotRef) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!sameSlot(dragOverSlot, target)) setDragOverSlot(target);
  }

  function handleDrop(e: React.DragEvent, target: SlotRef) {
    e.preventDefault();
    const source = dragSourceRef.current;
    dragSourceRef.current = null;
    setDraggingSlot(null);
    setDragOverSlot(null);
    if (!source) return;
    swapSlots(source, target);
  }

  function handleDragEnd() {
    dragSourceRef.current = null;
    setDraggingSlot(null);
    setDragOverSlot(null);
  }

  async function handleImportAll() {
    if (!categorySlug) {
      showToast("Pick a category for this batch", "error");
      return;
    }
    if (!baseName.trim()) {
      showToast("Enter a name for this batch", "error");
      return;
    }
    if (!price || Number(price) < 0) {
      showToast("Enter a valid price", "error");
      return;
    }
    if (activeGroups.length === 0) {
      showToast("No products to import — everything's been skipped", "error");
      return;
    }

    // Rearranging can leave a product's Main slot empty (its image was
    // dragged elsewhere and nothing moved in to replace it) — catch that
    // before spending time uploading anything.
    const missingMainCount = activeGroups.filter((g) => !g.images[0]).length;
    if (missingMainCount > 0) {
      showToast(
        `${missingMainCount} product${missingMainCount !== 1 ? "s are" : " is"} missing a Main image — drag an image into the Main slot, or skip that product`,
        "error"
      );
      return;
    }

    setImporting(true);
    setResults(null);

    const uploadedUrls: string[][] = activeGroups.map(() => ["", "", ""]);
    const tasks: { file: File; onDone: (url: string) => void }[] = [];
    activeGroups.forEach((group, groupIdx) => {
      group.images.forEach((file, slotIdx) => {
        if (file) {
          tasks.push({ file, onDone: (url) => { uploadedUrls[groupIdx][slotIdx] = url; } });
        }
      });
    });

    setProgress({ done: 0, total: tasks.length });
    await uploadWithConcurrency(tasks, CONCURRENCY, (done, total) => setProgress({ done, total }));

    const payload = activeGroups.map((_, i) => ({
      name: baseName.trim(),
      categorySlug,
      price,
      compareAtPrice: compareAtPrice || undefined,
      image: uploadedUrls[i][0],
      images: [uploadedUrls[i][1], uploadedUrls[i][2]].filter(Boolean),
      stock,
    }));

    try {
      const result = await bulkCreateProducts(payload);
      setResults(result);
      if (result.errorCount === 0) {
        showToast(`${result.createdCount} products created — edit them individually to fine-tune details`);
        resetBatch();
      } else {
        showToast(`${result.createdCount} created, ${result.errorCount} failed`, "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }

  return (
    <div className="pb-28">
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Bulk Import Products</h1>
      <p className="mt-1 font-body text-sm text-muted">
        Select a folder or a batch of images — no need to name files. Choose how many images belong to each
        product, set one price/name/stock for the whole batch, then fine-tune individual products afterward.
      </p>

      {files.length === 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-white/15 bg-surface py-14 text-center hover:border-accent/40">
            <FolderOpen size={26} className="text-muted" />
            <p className="font-body text-sm text-ink">Select a Folder</p>
            <p className="px-4 font-mono text-[10px] text-muted">Desktop only — auto-detects category from folder name</p>
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error non-standard attributes, needed for folder selection
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => handleFolderSelected(e.target.files)}
            />
            <span
              onClick={() => folderInputRef.current?.click()}
              className="mt-1 rounded-full bg-accent px-5 py-2 font-body text-xs font-semibold text-bg"
            >
              Choose Folder
            </span>
          </label>

          <label className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-white/15 bg-surface py-14 text-center hover:border-accent/40">
            <Images size={26} className="text-muted" />
            <p className="font-body text-sm text-ink">Select Images</p>
            <p className="px-4 font-mono text-[10px] text-muted">Works on PC and mobile — pick category manually</p>
            <input
              ref={imagesInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImagesSelected(e.target.files)}
            />
            <span
              onClick={() => imagesInputRef.current?.click()}
              className="mt-1 rounded-full bg-accent px-5 py-2 font-body text-xs font-semibold text-bg"
            >
              Choose Images
            </span>
          </label>
        </div>
      ) : (
        <>
          {/* Batch settings — applies to every product created in this import */}
          <div className="mt-6 rounded-2xl border border-white/5 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="font-body text-sm font-semibold text-ink">
                {files.length} image{files.length !== 1 ? "s" : ""} selected
                {detectedFolder && <span className="text-muted"> from &ldquo;{detectedFolder}&rdquo;</span>}
              </p>
              <button onClick={resetBatch} className="font-body text-xs text-muted hover:text-accent2">
                Start over
              </button>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block font-body text-xs text-muted">Images per product</label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setImagesPerProduct(n)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 font-body text-xs transition-colors",
                      imagesPerProduct === n ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted"
                    )}
                  >
                    {n} {n === 1 ? "image" : "images"}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-muted">
                → {Math.ceil(files.length / imagesPerProduct)} product{Math.ceil(files.length / imagesPerProduct) !== 1 ? "s" : ""} will be created
                {groups.length > 0 && " · tap two images to swap them, drag on desktop, or clear one with the × — changing this setting resets any rearranging"}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Category (applies to all)</label>
                <select
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Name (applies to all — edit individually after)</label>
                <input
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                  placeholder="e.g. Cargo Pants"
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Compare-at (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Stock (each)</label>
                <input
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50"
                />
              </div>
            </div>
          </div>

          {/* Preview grid — verify grouping/order looks right, and rearrange
              images across products before spending time uploading. */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {groups.map((group, groupIndex) => {
              const skipped = skippedGroupIds.has(group.id);
              const missingMain = !group.images[0];
              return (
                <div
                  key={group.id}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-surface transition-opacity",
                    skipped ? "border-white/5 opacity-40" : "border-white/10"
                  )}
                >
                  <div className="grid grid-cols-3 gap-px bg-white/5">
                    {group.images.map((file, slotIndex) => {
                      const target: SlotRef = { groupIndex, slotIndex };
                      const isSelected = sameSlot(selectedSlot, target);
                      const isDragOver = sameSlot(dragOverSlot, target);
                      const isDragging = sameSlot(draggingSlot, target);
                      return (
                        <div
                          key={slotIndex}
                          onClick={() => handleSlotClick(target)}
                          onDragOver={(e) => handleDragOver(e, target)}
                          onDrop={(e) => handleDrop(e, target)}
                          className={cn(
                            "group/slot relative aspect-square bg-surface2 transition-all",
                            file ? "cursor-pointer" : "cursor-default",
                            isSelected && "ring-2 ring-inset ring-accent",
                            isDragOver && !isSelected && "ring-2 ring-inset ring-accent/60",
                            isDragging && "opacity-30"
                          )}
                        >
                          {file ? (
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, target)}
                              onDragEnd={handleDragEnd}
                              className="h-full w-full"
                            >
                              <Image src={URL.createObjectURL(file)} alt="" fill sizes="100px" className="pointer-events-none object-cover" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSlotImage(target);
                                }}
                                aria-label="Remove image"
                                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bg/85 text-ink opacity-0 backdrop-blur-sm transition-opacity hover:text-accent2 group-hover/slot:opacity-100"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center border border-dashed border-white/10">
                              <span className="font-mono text-[9px] text-muted">Empty</span>
                            </div>
                          )}
                          <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-bg/70 px-1 font-mono text-[8px] uppercase text-muted backdrop-blur-sm">
                            {SLOT_LABELS[slotIndex]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between p-1.5">
                    <span className={cn("font-mono text-[10px]", missingMain && !skipped ? "text-accent2" : "text-muted")}>
                      Product {groupIndex + 1}{missingMain && !skipped ? " · no main image" : ""}
                    </span>
                    <button onClick={() => toggleSkip(group.id)} className="text-muted hover:text-accent2" title="Skip this product">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Sticky action bar — stays reachable on mobile without scrolling back up */}
      {files.length > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-surface/95 px-4 py-3 backdrop-blur-sm lg:pl-[calc(16rem+1rem)]"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto flex max-w-5xl items-center gap-4">
            <button
              onClick={handleImportAll}
              disabled={importing}
              className="flex shrink-0 items-center gap-2 rounded-full bg-accent px-6 py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:opacity-70"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {importing ? "Importing…" : `Create ${activeGroups.length} Products`}
            </button>
            {progress ? (
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  Uploading: {progress.done}/{progress.total}
                </p>
              </div>
            ) : (
              <p className="hidden font-body text-xs text-muted sm:block">
                {activeGroups.length} product{activeGroups.length !== 1 ? "s" : ""} · edit details individually after import
              </p>
            )}
          </div>
        </div>
      )}

      {results && results.errorCount > 0 && (
        <div className="mt-5 rounded-2xl border border-accent2/30 bg-accent2/5 p-4">
          <p className="font-body text-sm font-semibold text-accent2">
            {results.createdCount} created, {results.errorCount} failed:
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-muted">
            {results.errors.map((e, i) => (
              <li key={i}>
                Product {e.index + 1}: {e.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}