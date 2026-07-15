import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SizeChartColumn {
  key: string;
  label: string;
}

export interface SizeChartRow {
  size: string;
  values: Record<string, string>;
}

export interface SizeChart {
  categorySlug: string;
  columns: SizeChartColumn[];
  rows: SizeChartRow[];
}

const defaultChart = (categorySlug: string): SizeChart => ({
  categorySlug,
  columns: [
    { key: "measure1", label: "Chest (in)" },
    { key: "measure2", label: "Length (in)" },
  ],
  rows: [
    { size: "S", values: { measure1: "36-38", measure2: "27" } },
    { size: "M", values: { measure1: "38-40", measure2: "28" } },
    { size: "L", values: { measure1: "40-42", measure2: "29" } },
    { size: "XL", values: { measure1: "42-44", measure2: "30" } },
  ],
});

interface SizeChartState {
  charts: Record<string, SizeChart>;
  getChart: (categorySlug: string) => SizeChart | null;
  saveChart: (chart: SizeChart) => void;
  removeChart: (categorySlug: string) => void;
  ensureDefault: (categorySlug: string) => SizeChart;
}

export const useSizeChartStore = create<SizeChartState>()(
  persist(
    (set, get) => ({
      charts: {},
      getChart: (categorySlug) => get().charts[categorySlug] ?? null,
      saveChart: (chart) => set((state) => ({ charts: { ...state.charts, [chart.categorySlug]: chart } })),
      removeChart: (categorySlug) =>
        set((state) => {
          const next = { ...state.charts };
          delete next[categorySlug];
          return { charts: next };
        }),
      ensureDefault: (categorySlug) => {
        const existing = get().charts[categorySlug];
        if (existing) return existing;
        const chart = defaultChart(categorySlug);
        set((state) => ({ charts: { ...state.charts, [categorySlug]: chart } }));
        return chart;
      },
    }),
    { name: "numen-size-charts" }
  )
);