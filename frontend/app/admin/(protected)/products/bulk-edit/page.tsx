"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowLeft,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  HelpCircle,
  Loader2,
  Search,
  Star,
  Trash2,
  UploadCloud,
  X,
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
const HIDDEN_COLUMNS_STORAGE_KEY = "numen-admin-bulk-edit-hidden-columns";

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

const BOOLEAN_FIELDS = new Set<EditableField>(["isNew", "isSpotlight"]);

// Checkbox column (40px) + image column (88px) — kept in sync with the
// `left-*` offsets on the sticky <th>/<td> pair below, so the image column
// tucks in flush against the checkbox column regardless of viewport.
const CHECKBOX_COL_WIDTH = 40;

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: "Click", desc: "Select a single cell" },
  { keys: "Shift + Click", desc: "Extend selection to a range" },
  { keys: "Arrow keys", desc: "Move the active cell" },
  { keys: "Shift + Arrows", desc: "Extend selection with the keyboard" },
  { keys: "Enter / F2", desc: "Edit the selected cell" },
  { keys: "Type a character", desc: "Start editing & replace the value" },
  { keys: "Enter (editing)", desc: "Save & move down" },
  { keys: "Tab / Shift+Tab", desc: "Save & move right / left" },
  { keys: "Esc", desc: "Cancel editing / clear selection" },
  { keys: "⌘/Ctrl + C", desc: "Copy the selected cells" },
  { keys: "⌘/Ctrl + V", desc: "Paste into the selected cells" },
  { keys: "⌘/Ctrl + D", desc: "Fill down — copy the top row of the selection to the rows below it" },
  { keys: "Delete / Backspace", desc: "Clear the selected cells" },
  { keys: "⌘/Ctrl + A", desc: "Select the entire visible grid" },
  { keys: "Space / Enter", desc: "Toggle a New / Spotlight checkbox cell" },
  { keys: "Click a column header", desc: "Bulk-set one value for every shown product in that column" },
];

interface CellPos {
  row: number;
  col: number;
}

interface SelectionRange {
  anchor: CellPos;
  focus: CellPos;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeRange(sel: SelectionRange) {
  return {
    rowStart: Math.min(sel.anchor.row, sel.focus.row),
    rowEnd: Math.max(sel.anchor.row, sel.focus.row),
    colStart: Math.min(sel.anchor.col, sel.focus.col),
    colEnd: Math.max(sel.anchor.col, sel.focus.col),
  };
}

function isCellSelected(sel: SelectionRange | null, row: number, col: number) {
  if (!sel) return false;
  const { rowStart, rowEnd, colStart, colEnd } = normalizeRange(sel);
  return row >= rowStart && row <= rowEnd && col >= colStart && col <= colEnd;
}

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

  // Spreadsheet-style cell selection & editing (desktop grid only).
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [editingCell, setEditingCell] = useState<CellPos | null>(null);
  const [editDraft, setEditDraft] = useState("");

  // Column visibility, persisted across visits.
  const [hiddenColumns, setHiddenColumns] = useState<Set<EditableField>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw) as EditableField[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [uploadingCell, setUploadingCell] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ done: 0, total: 0 });

  const pendingUploadsRef = useRef<{ url: string; path: string }[]>([]);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const selectRefs = useRef<Record<string, HTMLSelectElement | null>>({});
  const internalClipboardRef = useRef<string[][] | null>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

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

  // Persist column visibility.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HIDDEN_COLUMNS_STORAGE_KEY, JSON.stringify(Array.from(hiddenColumns)));
  }, [hiddenColumns]);

  // Close the column-visibility popover on outside click.
  useEffect(() => {
    if (!showColumnMenu) return;
    function handleClick(e: globalThis.MouseEvent) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setShowColumnMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showColumnMenu]);

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

  const visibleColumns = useMemo(() => COLUMNS.filter((c) => !hiddenColumns.has(c.field)), [hiddenColumns]);

  const selectionInfo = useMemo(() => {
    if (!selection) return null;
    const { rowStart, rowEnd, colStart, colEnd } = normalizeRange(selection);
    return {
      rowStart,
      rowEnd,
      colStart,
      colEnd,
      rowCount: rowEnd - rowStart + 1,
      colCount: colEnd - colStart + 1,
      cellCount: (rowEnd - rowStart + 1) * (colEnd - colStart + 1),
    };
  }, [selection]);

  // Keep the selection in bounds if filters/column visibility shrink the grid.
  useEffect(() => {
    setSelection((prev) => {
      if (!prev) return prev;
      if (filteredIds.length === 0 || visibleColumns.length === 0) return null;
      const clampPos = (p: CellPos) => ({
        row: clamp(p.row, 0, filteredIds.length - 1),
        col: clamp(p.col, 0, visibleColumns.length - 1),
      });
      return { anchor: clampPos(prev.anchor), focus: clampPos(prev.focus) };
    });
  }, [filteredIds.length, visibleColumns.length]);

  // Keep DOM focus in sync with the active cell.
  useEffect(() => {
    if (!selection || editingCell) return;
    const key = `${selection.focus.row}-${selection.focus.col}`;
    cellRefs.current[key]?.focus();
  }, [selection, editingCell]);

  function updateField(id: string, field: keyof GridRow, value: string | boolean) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function toggleColumnHidden(field: EditableField) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
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

  // ---------- Spreadsheet-style cell selection, editing & shortcuts ----------

  function handleCellMouseDown(row: number, col: number, e: MouseEvent<HTMLDivElement>) {
    const field = visibleColumns[col]?.field;
    // Don't preventDefault on select/checkbox cells — they need their native click.
    if (field && field !== "categorySlug" && !BOOLEAN_FIELDS.has(field)) {
      e.preventDefault();
    }
    if (editingCell) commitEdit();
    setSelection((prev) => {
      if (e.shiftKey && prev) return { anchor: prev.anchor, focus: { row, col } };
      return { anchor: { row, col }, focus: { row, col } };
    });
  }

  function moveSelection(row: number, col: number, dRow: number, dCol: number, extend: boolean) {
    const newRow = clamp(row + dRow, 0, filteredIds.length - 1);
    const newCol = clamp(col + dCol, 0, visibleColumns.length - 1);
    setSelection((prev) => ({
      anchor: extend && prev ? prev.anchor : { row: newRow, col: newCol },
      focus: { row: newRow, col: newCol },
    }));
  }

  function startEdit(row: number, col: number, initialValue?: string) {
    const field = visibleColumns[col]?.field;
    const id = filteredIds[row];
    if (!field || !id) return;
    const r = rows[id];
    if (!r) return;
    if (field === "stock" && r.hasVariants) return;
    if (BOOLEAN_FIELDS.has(field)) {
      updateField(id, field, !(r[field] as boolean));
      return;
    }
    if (field === "categorySlug") {
      selectRefs.current[`${row}-${col}`]?.focus();
      return;
    }
    setEditingCell({ row, col });
    setEditDraft(initialValue !== undefined ? initialValue : (r[field] as string));
  }

  function commitEdit(moveTo?: CellPos) {
    if (editingCell) {
      const field = visibleColumns[editingCell.col]?.field;
      const id = filteredIds[editingCell.row];
      if (field && id) updateField(id, field, editDraft);
      setEditingCell(null);
    }
    if (moveTo) {
      const row = clamp(moveTo.row, 0, filteredIds.length - 1);
      const col = clamp(moveTo.col, 0, visibleColumns.length - 1);
      setSelection({ anchor: { row, col }, focus: { row, col } });
    }
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  function clearSelectedCells() {
    if (!selection) return;
    const { rowStart, rowEnd, colStart, colEnd } = normalizeRange(selection);
    setRows((prev) => {
      const next = { ...prev };
      for (let r = rowStart; r <= rowEnd; r++) {
        const id = filteredIds[r];
        const row = next[id];
        if (!row) continue;
        const updated: GridRow = { ...row };
        for (let c = colStart; c <= colEnd; c++) {
          const field = visibleColumns[c]?.field;
          if (!field || field === "categorySlug") continue;
          if (field === "stock" && row.hasVariants) continue;
          if (BOOLEAN_FIELDS.has(field)) (updated as any)[field] = false;
          else (updated as any)[field] = "";
        }
        next[id] = updated;
      }
      return next;
    });
    showToast("Cleared selected cells", "info");
  }

  async function copySelection() {
    if (!selection) return;
    const { rowStart, rowEnd, colStart, colEnd } = normalizeRange(selection);
    const grid: string[][] = [];
    for (let r = rowStart; r <= rowEnd; r++) {
      const id = filteredIds[r];
      const row = rows[id];
      const line: string[] = [];
      for (let c = colStart; c <= colEnd; c++) {
        const field = visibleColumns[c]?.field;
        if (!field || !row) {
          line.push("");
          continue;
        }
        const val = row[field];
        line.push(typeof val === "boolean" ? (val ? "true" : "false") : String(val ?? ""));
      }
      grid.push(line);
    }
    internalClipboardRef.current = grid;
    const text = grid.map((l) => l.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard permission denied — the internal fallback below still lets paste work on this page.
    }
    const count = grid.length * (grid[0]?.length ?? 0);
    showToast(`Copied ${count} cell${count !== 1 ? "s" : ""}`, "info");
  }

  async function pasteSelection() {
    if (!selection) return;
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      text = "";
    }
    let grid: string[][];
    if (text) {
      const lines = text.replace(/\r/g, "").split("\n");
      if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
      grid = lines.map((l) => l.split("\t"));
    } else if (internalClipboardRef.current) {
      grid = internalClipboardRef.current;
    } else {
      return;
    }

    const startRow = Math.min(selection.anchor.row, selection.focus.row);
    const startCol = Math.min(selection.anchor.col, selection.focus.col);

    setRows((prev) => {
      const next = { ...prev };
      for (let r = 0; r < grid.length; r++) {
        const targetRow = startRow + r;
        if (targetRow >= filteredIds.length) break;
        const id = filteredIds[targetRow];
        const row = next[id];
        if (!row) continue;
        const updated: GridRow = { ...row };
        for (let c = 0; c < grid[r].length; c++) {
          const targetCol = startCol + c;
          if (targetCol >= visibleColumns.length) break;
          const field = visibleColumns[targetCol]?.field;
          if (!field) continue;
          if (field === "stock" && row.hasVariants) continue;
          const raw = grid[r][c];
          if (BOOLEAN_FIELDS.has(field)) {
            (updated as any)[field] = ["true", "yes", "1"].includes(raw.trim().toLowerCase());
          } else if (field === "categorySlug") {
            const match = categories.find(
              (cat) => cat.slug === raw.trim() || cat.name.toLowerCase() === raw.trim().toLowerCase()
            );
            if (match) (updated as any)[field] = match.slug;
          } else {
            (updated as any)[field] = raw;
          }
        }
        next[id] = updated;
      }
      return next;
    });
    showToast("Pasted", "info");
  }

  function fillDown() {
    if (!selection) return;
    const { rowStart, rowEnd, colStart, colEnd } = normalizeRange(selection);
    if (rowEnd === rowStart) return;
    const topId = filteredIds[rowStart];
    const topRow = rows[topId];
    if (!topRow) return;

    setRows((prev) => {
      const next = { ...prev };
      for (let c = colStart; c <= colEnd; c++) {
        const field = visibleColumns[c]?.field;
        if (!field) continue;
        const value = topRow[field];
        for (let r = rowStart + 1; r <= rowEnd; r++) {
          const id = filteredIds[r];
          const row = next[id];
          if (!row) continue;
          if (field === "stock" && row.hasVariants) continue;
          next[id] = { ...next[id], [field]: value };
        }
      }
      return next;
    });
    showToast("Filled down", "info");
  }

  function handleCellKeyDown(row: number, col: number, e: KeyboardEvent<HTMLDivElement>) {
    const field = visibleColumns[col]?.field;
    const targetTag = (e.target as HTMLElement).tagName;

    // Let a focused native <select> handle its own arrow/typeahead keys.
    if (field === "categorySlug" && targetTag === "SELECT" && e.key !== "Tab" && e.key !== "Escape") {
      return;
    }

    if (e.key === "ArrowDown") { e.preventDefault(); moveSelection(row, col, 1, 0, e.shiftKey); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveSelection(row, col, -1, 0, e.shiftKey); }
    else if (e.key === "ArrowRight") { e.preventDefault(); moveSelection(row, col, 0, 1, e.shiftKey); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); moveSelection(row, col, 0, -1, e.shiftKey); }
    else if (e.key === "Tab") { e.preventDefault(); moveSelection(row, col, 0, e.shiftKey ? -1 : 1, false); }
    else if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); startEdit(row, col); }
    else if (e.key === " " && field && BOOLEAN_FIELDS.has(field)) { e.preventDefault(); startEdit(row, col); }
    else if (e.key === "Escape") {
      if (targetTag === "SELECT") (e.target as HTMLSelectElement).blur();
      else setSelection(null);
    }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); clearSelectedCells(); }
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") { e.preventDefault(); copySelection(); }
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") { e.preventDefault(); pasteSelection(); }
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") { e.preventDefault(); fillDown(); }
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      setSelection({ anchor: { row: 0, col: 0 }, focus: { row: filteredIds.length - 1, col: visibleColumns.length - 1 } });
    }
    else if (
      e.key.length === 1 &&
      !e.metaKey && !e.ctrlKey && !e.altKey &&
      field && !BOOLEAN_FIELDS.has(field) && field !== "categorySlug"
    ) {
      startEdit(row, col, e.key);
    }
  }

  function renderCell(rowIdx: number, colIdx: number) {
    const id = filteredIds[rowIdx];
    const row = rows[id];
    const col = visibleColumns[colIdx];
    if (!row || !col) return null;
    const field = col.field;
    const key = `${rowIdx}-${colIdx}`;
    const selected = isCellSelected(selection, rowIdx, colIdx);
    const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
    const disabled = field === "stock" && row.hasVariants;

    if (BOOLEAN_FIELDS.has(field)) {
      return (
        <div
          ref={(el) => { cellRefs.current[key] = el; }}
          tabIndex={0}
          onMouseDown={(e) => handleCellMouseDown(rowIdx, colIdx, e)}
          onKeyDown={(e) => handleCellKeyDown(rowIdx, colIdx, e)}
          className={cn(
            "flex min-h-[34px] items-center rounded-lg border px-2 py-1.5 outline-none",
            selected ? "border-accent bg-accent/10" : "border-transparent hover:border-white/10 hover:bg-white/5"
          )}
        >
          <input
            type="checkbox"
            tabIndex={-1}
            checked={row[field] as boolean}
            onChange={(e) => updateField(id, field, e.target.checked)}
            className="h-4 w-4 rounded border-white/10 accent-[var(--color-accent)]"
          />
        </div>
      );
    }

    if (field === "categorySlug") {
      return (
        <div
          ref={(el) => { cellRefs.current[key] = el; }}
          tabIndex={0}
          onMouseDown={(e) => handleCellMouseDown(rowIdx, colIdx, e)}
          onKeyDown={(e) => handleCellKeyDown(rowIdx, colIdx, e)}
          className={cn(
            "rounded-lg border outline-none",
            selected ? "border-accent bg-accent/10" : "border-transparent hover:border-white/10 hover:bg-white/5"
          )}
        >
          <select
            ref={(el) => { selectRefs.current[key] = el; }}
            tabIndex={-1}
            value={row.categorySlug}
            onChange={(e) => updateField(id, "categorySlug", e.target.value)}
            onFocus={() => setSelection({ anchor: { row: rowIdx, col: colIdx }, focus: { row: rowIdx, col: colIdx } })}
            className="w-full rounded-lg bg-transparent px-2 py-1.5 font-body text-xs text-ink focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div
        ref={(el) => { cellRefs.current[key] = el; }}
        tabIndex={0}
        onMouseDown={(e) => handleCellMouseDown(rowIdx, colIdx, e)}
        onDoubleClick={() => !disabled && startEdit(rowIdx, colIdx)}
        onKeyDown={(e) => handleCellKeyDown(rowIdx, colIdx, e)}
        className={cn(
          "min-h-[34px] rounded-lg border px-2 py-1.5 font-mono text-xs text-ink outline-none transition-colors",
          disabled ? "opacity-40" : "cursor-text",
          selected ? "border-accent bg-accent/10" : "border-transparent hover:border-white/10 hover:bg-white/5"
        )}
      >
        {isEditing ? (
          <input
            autoFocus
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") { e.preventDefault(); commitEdit({ row: rowIdx + 1, col: colIdx }); }
              else if (e.key === "Tab") { e.preventDefault(); commitEdit({ row: rowIdx, col: colIdx + (e.shiftKey ? -1 : 1) }); }
              else if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
            }}
            onBlur={() => commitEdit()}
            className="w-full bg-transparent font-mono text-xs text-ink outline-none"
          />
        ) : (
          (row[field] as string) || <span className="text-muted">—</span>
        )}
      </div>
    );
  }

  // ---------- Uploads, save, discard, delete ----------

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
        <button
          type="button"
          onClick={() => setShowShortcuts((v) => !v)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 self-start rounded-full border px-4 py-2.5 font-body text-sm transition-colors sm:self-auto",
            showShortcuts ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-ink"
          )}
        >
          <HelpCircle size={14} /> Shortcuts
        </button>
      </div>

      {/* Shortcuts guide */}
      {showShortcuts && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-sm font-semibold text-ink">Keyboard & spreadsheet shortcuts</p>
            <button type="button" onClick={() => setShowShortcuts(false)} className="text-muted hover:text-ink">
              <X size={15} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between gap-3 font-body text-xs">
                <span className="whitespace-nowrap rounded-md border border-white/10 bg-bg px-2 py-1 font-mono text-[11px] text-ink">
                  {s.keys}
                </span>
                <span className="text-right text-muted">{s.desc}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-body text-[11px] text-muted">Applies to the spreadsheet table view (tablet/desktop).</p>
        </div>
      )}

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

        {/* Column visibility — desktop grid only */}
        <div className="relative hidden md:block" ref={columnMenuRef}>
          <button
            type="button"
            onClick={() => setShowColumnMenu((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-4 py-2.5 font-body text-sm transition-colors",
              hiddenColumns.size > 0 ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-ink"
            )}
          >
            <Columns3 size={14} />
            Columns{hiddenColumns.size > 0 ? ` (${visibleColumns.length}/${COLUMNS.length})` : ""}
          </button>
          {showColumnMenu && (
            <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-white/10 bg-surface p-2 shadow-2xl">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted">Show columns</span>
                {hiddenColumns.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setHiddenColumns(new Set())}
                    className="font-body text-[11px] text-accent hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              {COLUMNS.map((c) => (
                <label
                  key={c.field}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 font-body text-xs text-ink hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenColumns.has(c.field)}
                    onChange={() => toggleColumnHidden(c.field)}
                    className="h-3.5 w-3.5 rounded border-white/10 accent-[var(--color-accent)]"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <span className="ml-auto font-mono text-xs text-muted">{filteredIds.length} shown</span>
      </div>

      {/* Column-fill toolbar — appears once a column header is clicked (whole column, all shown rows) */}
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

      {/* Cell-selection toolbar — appears once one or more cells are selected in the grid */}
      {selectionInfo && (
        <div className="mt-3 hidden flex-wrap items-center gap-2.5 rounded-2xl border border-white/10 bg-surface px-4 py-2.5 md:flex">
          <span className="font-mono text-xs text-muted">
            {selectionInfo.cellCount} cell{selectionInfo.cellCount !== 1 ? "s" : ""} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fillDown}
              disabled={selectionInfo.rowCount < 2}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 font-body text-xs text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowDownToLine size={12} /> Fill Down <span className="text-[10px] opacity-60">⌘D</span>
            </button>
            <button
              type="button"
              onClick={copySelection}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 font-body text-xs text-muted hover:text-ink"
            >
              <Copy size={12} /> Copy <span className="text-[10px] opacity-60">⌘C</span>
            </button>
            <button
              type="button"
              onClick={clearSelectedCells}
              className="rounded-full border border-white/10 px-3 py-1.5 font-body text-xs text-muted hover:text-ink"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="rounded-full border border-white/10 px-3 py-1.5 font-body text-xs text-muted hover:text-ink"
            >
              Deselect
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
          Column selection, keyboard shortcuts, and range fill/copy/paste are available on a larger screen.
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
              {visibleColumns.map((col) => {
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
            {filteredIds.map((id, rowIdx) => {
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

                  {visibleColumns.map((col, colIdx) => (
                    <td key={col.field} className="p-1">
                      {renderCell(rowIdx, colIdx)}
                    </td>
                  ))}

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
                <td colSpan={visibleColumns.length + 4} className="p-10 text-center font-body text-sm text-muted">
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