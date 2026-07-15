export interface CurrencyRateDTO {
  code: string;
  rate: number;
  symbol: string;
}

export async function fetchCurrencyRates(): Promise<CurrencyRateDTO[]> {
  const res = await fetch("/api/currency-rates");
  if (!res.ok) throw new Error("Failed to load currency rates.");
  return res.json();
}

export async function createCurrencyRate(code: string, rate: number, symbol: string): Promise<CurrencyRateDTO> {
  const res = await fetch("/api/currency-rates", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, rate, symbol }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to add currency.");
  return data;
}

export async function updateCurrencyRate(
  code: string,
  updates: { rate?: number; symbol?: string }
): Promise<CurrencyRateDTO> {
  const res = await fetch(`/api/currency-rates/${code}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update currency.");
  return data;
}

export async function deleteCurrencyRate(code: string): Promise<void> {
  const res = await fetch(`/api/currency-rates/${code}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to delete currency.");
  }
}