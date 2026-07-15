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
  updatedAt?: string;
}

export function defaultSizeChart(categorySlug: string): SizeChart {
  return {
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
  };
}

export async function fetchSizeChart(categorySlug: string): Promise<SizeChart | null> {
  const res = await fetch(`/api/size-charts/${categorySlug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load size chart.");
  return res.json();
}

export async function saveSizeChart(
  categorySlug: string,
  data: { columns: SizeChartColumn[]; rows: SizeChartRow[] }
): Promise<SizeChart> {
  const res = await fetch(`/api/size-charts/${categorySlug}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to save size chart.");
  return json;
}