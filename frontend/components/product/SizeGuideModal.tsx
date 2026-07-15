"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ruler, X } from "lucide-react";
import { fetchSizeChart, SizeChart } from "@/src/lib/sizeCharts";

const ease = [0.16, 1, 0.3, 1] as const;

export default function SizeGuideModal({ categorySlug }: { categorySlug: string }) {
  const [open, setOpen] = useState(false);
  const [chart, setChart] = useState<SizeChart | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetchSizeChart(categorySlug)
      .then((c) => {
        if (!cancelled) setChart(c);
      })
      .catch(() => {
        if (!cancelled) setChart(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  if (!loaded || !chart) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 font-body text-xs text-muted underline-offset-2 hover:text-accent hover:underline"
      >
        <Ruler size={13} /> Size guide
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.3, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-ink">Size Guide</h3>
                <button onClick={() => setOpen(false)} className="text-muted hover:text-ink">
                  <X size={18} />
                </button>
              </div>

              <table className="mt-4 w-full border-collapse font-body text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left font-mono text-[11px] uppercase tracking-widest text-muted">
                    <th className="py-2">Size</th>
                    {chart.columns.map((col) => (
                      <th key={col.key} className="py-2">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chart.rows.map((row) => (
                    <tr key={row.size} className="border-b border-white/5 text-ink">
                      <td className="py-2 font-mono">{row.size}</td>
                      {chart.columns.map((col) => (
                        <td key={col.key} className="py-2 text-muted">{row.values[col.key] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-4 font-body text-xs text-muted">
                Measurements in inches. If you&apos;re between sizes, we&apos;d recommend sizing up for a relaxed fit.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}