"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { FolderOpen, Images, Loader2, Trash2, UploadCloud } from "lucide-react";
import { fetchCategories, type Category } from "@/src/lib/categories";
import { bulkCreateProducts, type BulkCreateResult } from "@/src/lib/products";
import { uploadMedia } from "@/src/lib/media";
import { useToastStore } from "@/src/hooks/useToastStore";
import { chunkImages, guessCategoryFromFolderName, extractFolderName, type ImageGroup } from "@/src/lib/bulkImport";
import { cn } from "@/src/lib/utils";

const CONCURRENCY = 4;

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

  const [skippedGroupIds, setSkippedGroupIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  // Typed from the shared BulkCreateResult (defined alongside bulkCreateProducts in
  // src/lib/products.ts) rather than a duplicated inline shape here — if the API's
  // response shape ever changes, this component picks it up automatically instead
  // of silently drifting out of sync and hiding a real type error.
  const [results, setResults] = useState<BulkCreateResult | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  useMemo(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const groups: ImageGroup[] = useMemo(() => chunkImages(files, imagesPerProduct), [files, imagesPerProduct]);
  const activeGroups = groups.filter((g) => !skippedGroupIds.has(g.id));

  function resetBatch() {
    setFiles([]);
    setSkippedGroupIds(new Set());
    setResults(null);
    setDetectedFolder(null);
  }

  function handleFolderSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      showToast("No images found in that folder", "error");
      return;
    }
    setFiles(imageFiles);
    setSkippedGroupIds(new Set());
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
    setSkippedGroupIds(new Set());
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

          {/* Preview grid — verify grouping/order looks right before spending time uploading */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {groups.map((group, i) => {
              const skipped = skippedGroupIds.has(group.id);
              return (
                <div
                  key={group.id}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-surface transition-opacity",
                    skipped ? "border-white/5 opacity-40" : "border-white/10"
                  )}
                >
                  <div className="grid grid-cols-3 gap-px bg-white/5">
                    {group.images.map((file, slotIdx) => (
                      <div key={slotIdx} className="relative aspect-square bg-surface2">
                        {file && (
                          <Image src={URL.createObjectURL(file)} alt="" fill sizes="100px" className="object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between p-1.5">
                    <span className="font-mono text-[10px] text-muted">Product {i + 1}</span>
                    <button onClick={() => toggleSkip(group.id)} className="text-muted hover:text-accent2">
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