"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FolderOpen,
  Images,
  Layers,
  Loader2,
  Package,
  Tag,
  Trash2,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import { fetchCategories, type Category } from "@/src/lib/categories";
import { bulkCreateProducts, type BulkCreateResult } from "@/src/lib/products";
import { uploadMedia } from "@/src/lib/media";
import { useToastStore } from "@/src/hooks/useToastStore";
import { chunkImages, guessCategoryFromFolderName, extractFolderName, type ImageGroup } from "@/src/lib/bulkImport";
import { cn } from "@/src/lib/utils";

const CONCURRENCY = 4;
// Products are created in chunks of this size rather than one giant
// request. A single request creating 40-50+ products sequentially on the
// server can run long enough to hit a serverless function's time limit
// (Vercel Hobby caps at 10s regardless; Pro defaults to 60s) and come back
// as a 502/504 with no indication of which rows, if any, actually made it
// in. Smaller requests finish comfortably inside any platform's limit and
// let progress — and partial success — show up incrementally.
const BATCH_SIZE = 15;
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

function SectionCard({ title, icon: Icon, action, children }: { title: string; icon: typeof Package; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
          <Icon size={15} className="text-accent" /> {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-muted">{children}</label>;
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
  // Tracks batches of the CREATE step (separate from `progress`, which
  // tracks image uploads) so the action bar can show "creating batch 2/4"
  // once uploads finish and the chunked bulkCreateProducts calls start.
  const [creationProgress, setCreationProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<BulkCreateResult | null>(null);
  const [showCreatedList, setShowCreatedList] = useState(false);

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

  // Blob URLs, cached per File object rather than regenerated on every
  // render. `URL.createObjectURL(file)` called directly inside JSX (as
  // this page used to do) hands back a NEW url string every single
  // render — which forces <Image> to treat it as a different image and
  // reload/flicker on any unrelated state change, including something as
  // small as a ring/selection toggle. That flicker is what was making the
  // "selected" outline look like it vanished on its own: the tile was
  // silently remounting underneath it, not the selection state resetting.
  const objectUrlCache = useRef<Map<File, string>>(new Map());
  useEffect(() => {
    // New file selection (or a reset) — the old File objects are gone for
    // good, so their blob URLs are no longer reachable from anywhere and
    // must be revoked here or they leak for the life of the tab.
    return () => {
      objectUrlCache.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlCache.current.clear();
    };
  }, [files]);
  function getObjectUrl(file: File) {
    let url = objectUrlCache.current.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      objectUrlCache.current.set(file, url);
    }
    return url;
  }

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setGroups(chunkImages(files, imagesPerProduct));
    setSkippedGroupIds(new Set());
    setSelectedSlot(null);
  }, [files, imagesPerProduct]);

  // Carries each active group's ORIGINAL position in `groups` alongside it.
  // Without this, error indices reported after import (which are relative
  // to the filtered/active list) end up pointing at the wrong tile in the
  // preview grid (which is numbered against the full list) the moment
  // anything has been skipped — exactly the "which product actually
  // failed?" confusion this page needs to not have.
  const activeGroupEntries = useMemo(
    () =>
      groups
        .map((group, originalIndex) => ({ group, originalIndex }))
        .filter(({ group }) => !skippedGroupIds.has(group.id)),
    [groups, skippedGroupIds]
  );

  function resetBatch() {
    setFiles([]);
    setGroups([]);
    setSkippedGroupIds(new Set());
    setResults(null);
    setDetectedFolder(null);
    setSelectedSlot(null);
    setShowCreatedList(false);
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
    if (activeGroupEntries.length === 0) {
      showToast("No products to import — everything's been skipped", "error");
      return;
    }

    // Rearranging can leave a product's Main slot empty (its image was
    // dragged elsewhere and nothing moved in to replace it) — catch that
    // before spending time uploading anything.
    const missingMainCount = activeGroupEntries.filter(({ group }) => !group.images[0]).length;
    if (missingMainCount > 0) {
      showToast(
        `${missingMainCount} product${missingMainCount !== 1 ? "s are" : " is"} missing a Main image — drag an image into the Main slot, or skip that product`,
        "error"
      );
      return;
    }

    setImporting(true);
    setResults(null);
    setShowCreatedList(false);

    const uploadedUrls: string[][] = activeGroupEntries.map(() => ["", "", ""]);
    const tasks: { file: File; onDone: (url: string) => void }[] = [];
    activeGroupEntries.forEach(({ group }, groupIdx) => {
      group.images.forEach((file, slotIdx) => {
        if (file) {
          tasks.push({ file, onDone: (url) => { uploadedUrls[groupIdx][slotIdx] = url; } });
        }
      });
    });

    setProgress({ done: 0, total: tasks.length });
    await uploadWithConcurrency(tasks, CONCURRENCY, (done, total) => setProgress({ done, total }));

    const payload = activeGroupEntries.map((_, i) => ({
      name: baseName.trim(),
      categorySlug,
      price,
      compareAtPrice: compareAtPrice || undefined,
      image: uploadedUrls[i][0],
      images: [uploadedUrls[i][1], uploadedUrls[i][2]].filter(Boolean),
      stock,
    }));

    setProgress(null); // uploads are done — swap the progress bar over to creation

    const aggregate: BulkCreateResult = { created: [], errors: [], createdCount: 0, errorCount: 0 };
    const totalBatches = Math.ceil(payload.length / BATCH_SIZE);
    setCreationProgress({ done: 0, total: totalBatches });

    for (let start = 0; start < payload.length; start += BATCH_SIZE) {
      const chunk = payload.slice(start, start + BATCH_SIZE);
      try {
        const chunkResult = await bulkCreateProducts(chunk);
        aggregate.created.push(...chunkResult.created);
        // Error indices come back relative to the chunk — offset them back
        // to the full-batch position so they line up with `payload`, which
        // is in the same order as `activeGroupEntries`. That's what lets
        // the results panel below trace an error back to the exact tile
        // (and its real "Product N" number) in the preview grid.
        aggregate.errors.push(...chunkResult.errors.map((e) => ({ ...e, index: e.index + start })));
        aggregate.createdCount += chunkResult.createdCount;
        aggregate.errorCount += chunkResult.errorCount;
      } catch (err) {
        // The request itself failed to come back as usable JSON — a
        // network error, a gateway timeout, a crashed function returning
        // an HTML/plain-text error page instead of a response body, etc.
        // We genuinely cannot tell from here whether any products in this
        // chunk were created before whatever went wrong — the honest
        // message says that explicitly instead of pretending certainty
        // either way (and instead of surfacing a raw "Unexpected token…"
        // parse error, which explains nothing).
        const rawMessage = err instanceof Error ? err.message : "";
        const looksLikeParseFailure = /unexpected token|json/i.test(rawMessage) || !rawMessage;
        const message = looksLikeParseFailure
          ? "The server didn't return a usable response for this batch. Some of these products may still have been created — check the Products list before retrying to avoid duplicates."
          : rawMessage;

        chunk.forEach((row, i) => {
          aggregate.errors.push({ index: start + i, name: row.name, error: message });
        });
        aggregate.errorCount += chunk.length;
      }

      setResults({ ...aggregate, created: [...aggregate.created], errors: [...aggregate.errors] });
      setCreationProgress({ done: Math.floor(start / BATCH_SIZE) + 1, total: totalBatches });
    }

    if (aggregate.errorCount === 0) {
      showToast(`${aggregate.createdCount} products created — edit them individually to fine-tune details`);
      resetBatch();
    } else {
      showToast(`${aggregate.createdCount} created, ${aggregate.errorCount} failed`, "error");
    }

    setImporting(false);
    setProgress(null);
    setCreationProgress(null);
  }

  const totalProducts = Math.ceil(files.length / imagesPerProduct);
  const stage: "uploading" | "creating" | "idle" = progress ? "uploading" : creationProgress ? "creating" : "idle";

  return (
    <div className="pb-32">
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Bulk Import Products</h1>
      <p className="mt-1 font-body text-sm text-muted">
        Select a folder or a batch of images — no need to name files. Choose how many images belong to each
        product, set one price/name/stock for the whole batch, then fine-tune individual products afterward.
      </p>

      {files.length === 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 bg-surface py-16 text-center transition-colors hover:border-accent/40 hover:bg-surface2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent transition-transform group-hover:scale-105">
              <FolderOpen size={22} />
            </div>
            <div>
              <p className="font-body text-sm font-semibold text-ink">Select a Folder</p>
              <p className="mt-1 px-4 font-mono text-[10px] text-muted">Desktop only — auto-detects category from folder name</p>
            </div>
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
            <span className="rounded-full bg-accent px-5 py-2 font-body text-xs font-semibold text-bg">Choose Folder</span>
          </label>

          <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 bg-surface py-16 text-center transition-colors hover:border-accent/40 hover:bg-surface2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent transition-transform group-hover:scale-105">
              <Images size={22} />
            </div>
            <div>
              <p className="font-body text-sm font-semibold text-ink">Select Images</p>
              <p className="mt-1 px-4 font-mono text-[10px] text-muted">Works on PC and mobile — pick category manually</p>
            </div>
            <input
              ref={imagesInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImagesSelected(e.target.files)}
            />
            <span className="rounded-full bg-accent px-5 py-2 font-body text-xs font-semibold text-bg">Choose Images</span>
          </label>
        </div>
      ) : (
        <>
          {/* Batch settings — applies to every product created in this import */}
          <div className="mt-6">
            <SectionCard
              title={`${files.length} image${files.length !== 1 ? "s" : ""} selected${detectedFolder ? ` — from "${detectedFolder}"` : ""}`}
              icon={Layers}
              action={
                <button onClick={resetBatch} className="font-body text-xs text-muted hover:text-accent2">
                  Start over
                </button>
              }
            >
              <div>
                <FieldLabel>Images per product</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {([1, 2, 3] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setImagesPerProduct(n)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 font-body text-xs transition-colors",
                        imagesPerProduct === n ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-ink"
                      )}
                    >
                      {n} {n === 1 ? "image" : "images"}
                    </button>
                  ))}
                </div>
                <p className="mt-2 rounded-lg bg-bg px-3 py-2 font-mono text-[10px] leading-relaxed text-muted">
                  → {totalProducts} product{totalProducts !== 1 ? "s" : ""} will be created
                  {groups.length > 0 && (
                    <> · tap an image, then tap another to swap them (tap it again to cancel) · drag on desktop · clear one with the × · changing this setting resets any rearranging</>
                  )}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>
                    <span className="flex items-center gap-1.5"><Tag size={11} /> Category (applies to all)</span>
                  </FieldLabel>
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
                  <FieldLabel>Name (applies to all — edit individually after)</FieldLabel>
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
                  <FieldLabel>
                    <span className="flex items-center gap-1.5"><Wallet size={11} /> Price (₹)</span>
                  </FieldLabel>
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
                  <FieldLabel>Compare-at (₹)</FieldLabel>
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
                  <FieldLabel>Stock (each)</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-accent/50"
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Selection hint banner — unmissable, persistent for as long as a slot is actually selected */}
          {selectedSlot && (
            <div className="sticky top-2 z-20 mt-4 flex items-center gap-2.5 rounded-full border border-accent/40 bg-accent/15 px-4 py-2.5 font-body text-xs text-accent shadow-lg backdrop-blur-sm">
              <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" />
              Image selected — tap another image to swap with it, or tap it again to cancel.
            </div>
          )}

          {/* Preview grid — verify grouping/order looks right, and rearrange
              images across products before spending time uploading. */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {groups.map((group, groupIndex) => {
              const skipped = skippedGroupIds.has(group.id);
              const missingMain = !group.images[0];

              // Once results come back, find whether THIS group (by its
              // true position, not the filtered one) shows up as an error.
              const errorEntry = results?.errors.find((e) => {
                const original = activeGroupEntries[e.index]?.originalIndex;
                return original === groupIndex;
              });

              return (
                <div
                  key={group.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-surface transition-all",
                    skipped ? "border-white/5 opacity-40" : errorEntry ? "border-accent2/50" : "border-white/10"
                  )}
                >
                  <div className="grid grid-cols-3 gap-1 bg-bg p-1">
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
                            "group/slot relative aspect-square overflow-hidden rounded-lg bg-surface2 transition-all",
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
                              <Image src={getObjectUrl(file)} alt="" fill sizes="100px" className="pointer-events-none object-cover" />
                              {isSelected && (
                                <div className="pointer-events-none absolute inset-0 bg-accent/15" />
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSlotImage(target);
                                }}
                                aria-label="Remove image"
                                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bg/85 text-ink opacity-70 backdrop-blur-sm transition-opacity hover:text-accent2 sm:opacity-0 sm:group-hover/slot:opacity-100"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-white/10">
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
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span
                      className={cn(
                        "flex items-center gap-1 font-mono text-[10px]",
                        errorEntry ? "text-accent2" : missingMain && !skipped ? "text-accent2" : "text-muted"
                      )}
                    >
                      {errorEntry && <AlertTriangle size={10} />}
                      Product {groupIndex + 1}
                      {missingMain && !skipped && !errorEntry ? " · no main image" : ""}
                      {errorEntry ? " · failed" : ""}
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
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-surface/95 px-4 py-3.5 backdrop-blur-sm lg:pl-[calc(16rem+1rem)]"
          style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto max-w-5xl">
            {stage === "idle" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-body text-xs text-muted">
                  {activeGroupEntries.length} product{activeGroupEntries.length !== 1 ? "s" : ""} ready · edit details individually after import
                </p>
                <button
                  onClick={handleImportAll}
                  disabled={importing}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:opacity-70"
                >
                  <UploadCloud size={16} />
                  Create {activeGroupEntries.length} Products
                </button>
              </div>
            ) : (
              <div>
                {/* Two-step progress: which phase we're in is always explicit,
                    not just a bar with a vague percentage. */}
                <div className="mb-2 flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest">
                  <span className={cn("flex items-center gap-1.5", stage === "uploading" ? "text-accent" : "text-muted")}>
                    {stage === "uploading" ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    1. Uploading images
                  </span>
                  <span className="text-white/10">→</span>
                  <span className={cn("flex items-center gap-1.5", stage === "creating" ? "text-accent" : "text-muted/50")}>
                    {stage === "creating" && <Loader2 size={11} className="animate-spin" />}
                    2. Creating products
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{
                      width: creationProgress
                        ? `${(creationProgress.done / creationProgress.total) * 100}%`
                        : progress
                          ? `${(progress.done / progress.total) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
                <p className="mt-1.5 font-mono text-[10px] text-muted">
                  {creationProgress
                    ? `Batch ${creationProgress.done} of ${creationProgress.total} · ${results?.createdCount ?? 0} created so far${results?.errorCount ? `, ${results.errorCount} failed so far` : ""}`
                    : progress
                      ? `${progress.done} of ${progress.total} images uploaded`
                      : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results — created and failed reported separately, with enough
          detail on failures to actually act on them. */}
      {results && (
        <div className="mt-6 space-y-4">
          {results.errorCount > 0 && (
            <div className="rounded-2xl border border-accent2/30 bg-accent2/5 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-accent2" />
                <p className="font-display text-sm font-bold text-ink">
                  {results.errorCount} product{results.errorCount !== 1 ? "s" : ""} failed
                </p>
              </div>
              <div className="space-y-2">
                {results.errors.map((e, i) => {
                  const original = activeGroupEntries[e.index]?.originalIndex;
                  const thumbFile = original !== undefined ? groups[original]?.images[0] : null;
                  const displayNumber = original !== undefined ? original + 1 : e.index + 1;
                  return (
                    <div key={i} className="flex gap-3 rounded-xl bg-bg p-3">
                      <div className="relative h-12 w-11 shrink-0 overflow-hidden rounded-lg bg-surface2">
                        {thumbFile ? (
                          <Image src={getObjectUrl(thumbFile)} alt="" fill sizes="44px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted">
                            <Package size={14} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-xs font-semibold text-ink">
                          Product {displayNumber}
                          {e.name ? <span className="font-normal text-muted"> — {e.name}</span> : null}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-surface2 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-accent2">
                          {e.error}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 font-body text-[11px] text-muted">
                Failed products stay in this batch below — fix the issue (or just retry) rather than re-uploading everything.
                You can also <Link href="/admin/products" className="text-accent hover:underline">check the Products list</Link> to
                confirm what did or didn't get created before retrying.
              </p>
            </div>
          )}

          {results.createdCount > 0 && (
            <div className="rounded-2xl border border-white/5 bg-surface p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setShowCreatedList((v) => !v)}
                className="flex w-full items-center justify-between"
              >
                <span className="flex items-center gap-2 font-display text-sm font-bold text-ink">
                  <CheckCircle2 size={16} className="text-accent" />
                  {results.createdCount} product{results.createdCount !== 1 ? "s" : ""} created successfully
                </span>
                <ChevronDown size={16} className={cn("text-muted transition-transform", showCreatedList && "rotate-180")} />
              </button>
              {showCreatedList && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {results.created.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-bg px-2 py-1.5">
                      <CheckCircle2 size={12} className="shrink-0 text-accent" />
                      <span className="truncate font-body text-xs text-ink">{c.name ?? "Product"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}