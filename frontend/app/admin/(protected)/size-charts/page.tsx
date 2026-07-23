"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useAdminCategoriesStore } from "@/src/hooks/useAdminCategoriesStore";
import { fetchSizeChart, saveSizeChart, defaultSizeChart, SizeChart } from "@/src/lib/sizeCharts";
import { useToastStore } from "@/src/hooks/useToastStore";

export default function AdminSizeChartsPage() {
  const categories = useAdminCategoriesStore((s) => s.categories);
  const showToast = useToastStore((s) => s.show);

  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [chart, setChart] = useState<SizeChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!categorySlug) return;
    let cancelled = false;
    setLoading(true);
    fetchSizeChart(categorySlug)
      .then((c) => {
        if (!cancelled) setChart(c ?? defaultSizeChart(categorySlug));
      })
      .catch((err) => {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : "Failed to load size chart", "error");
          setChart(defaultSizeChart(categorySlug));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlug, showToast]);

  if (loading || !chart) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  function addColumn() {
    setChart((c) => c && { ...c, columns: [...c.columns, { key: `col-${Date.now()}`, label: "New measurement" }] });
  }
  function removeColumn(key: string) {
    setChart((c) => c && { ...c, columns: c.columns.filter((col) => col.key !== key) });
  }
  function updateColumnLabel(key: string, label: string) {
    setChart((c) => c && { ...c, columns: c.columns.map((col) => (col.key === key ? { ...col, label } : col)) });
  }
  function addRow() {
    setChart((c) => c && { ...c, rows: [...c.rows, { size: "New", values: {} }] });
  }
  function removeRow(index: number) {
    setChart((c) => c && { ...c, rows: c.rows.filter((_, i) => i !== index) });
  }
  function updateRowSize(index: number, size: string) {
    setChart((c) => c && { ...c, rows: c.rows.map((r, i) => (i === index ? { ...r, size } : r)) });
  }
  function updateCell(index: number, colKey: string, value: string) {
    setChart(
      (c) =>
        c && {
          ...c,
          rows: c.rows.map((r, i) => (i === index ? { ...r, values: { ...r.values, [colKey]: value } } : r)),
        }
    );
  }

  async function handleSave() {
    if (!chart) return;
    setSaving(true);
    try {
      const savedChart = await saveSizeChart(categorySlug, { columns: chart.columns, rows: chart.rows });
      setChart(savedChart);
      setSaved(true);
      showToast("Size chart saved");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save size chart", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Size Charts</h1>
      <p className="mt-1 font-body text-sm text-muted">Configure a measurement chart per category — shown to customers on the product page.</p>

      <div className="mt-6">
        <select
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          className="rounded-full border border-white/10 bg-surface px-4 py-2.5 font-body text-sm text-ink focus:outline-none"
        >
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/5 bg-surface p-5">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted">Size</th>
              {chart.columns.map((col) => (
                <th key={col.key} className="p-2 text-left">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={col.label}
                      onChange={(e) => updateColumnLabel(col.key, e.target.value)}
                      className="w-28 rounded-lg border border-white/10 bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-ink focus:outline-none focus:border-accent/50"
                    />
                    <button onClick={() => removeColumn(col.key)} className="text-muted hover:text-accent2"><Trash2 size={12} /></button>
                  </div>
                </th>
              ))}
              <th className="p-2">
                <button onClick={addColumn} className="flex items-center gap-1 font-body text-xs text-accent hover:underline">
                  <Plus size={12} /> Column
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="p-2">
                  <input
                    value={row.size}
                    onChange={(e) => updateRowSize(i, e.target.value)}
                    className="w-16 rounded-lg border border-white/10 bg-bg px-2 py-1 font-mono text-xs text-ink focus:outline-none focus:border-accent/50"
                  />
                </td>
                {chart.columns.map((col) => (
                  <td key={col.key} className="p-2">
                    <input
                      value={row.values[col.key] ?? ""}
                      onChange={(e) => updateCell(i, col.key, e.target.value)}
                      className="w-28 rounded-lg border border-white/10 bg-bg px-2 py-1 font-mono text-xs text-ink focus:outline-none focus:border-accent/50"
                    />
                  </td>
                ))}
                <td className="p-2">
                  <button onClick={() => removeRow(i)} className="text-muted hover:text-accent2"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addRow} className="mt-3 flex items-center gap-1 font-body text-xs text-accent hover:underline">
          <Plus size={12} /> Add size row
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02] disabled:opacity-70"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saved && <Check size={16} />}
        {saving ? "Saving…" : saved ? "Saved" : "Save Chart"}
      </button>
    </div>
  );
}