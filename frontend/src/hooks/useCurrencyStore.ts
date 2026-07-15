import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CurrencyCode } from "@/src/types";
import { getCurrencyLabel } from "@/src/lib/currency";
import {
  fetchCurrencyRates,
  createCurrencyRate,
  updateCurrencyRate,
  deleteCurrencyRate,
  type CurrencyRateDTO,
} from "@/src/lib/currency-rates";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
}

const INR_META: CurrencyMeta = { code: "INR", symbol: "₹", label: "Indian Rupee", locale: "en-IN" };

function toMeta(row: CurrencyRateDTO): CurrencyMeta {
  return { code: row.code, symbol: row.symbol, label: getCurrencyLabel(row.code), locale: "en-US" };
}

interface CurrencyState {
  currency: CurrencyCode;
  userSelected: boolean;
  rates: Record<string, number>; // "1 <code> = X INR"
  symbols: Record<string, string>; // "1 <code> = X INR" — admin-set annotation per code
  currencies: CurrencyMeta[];
  ratesLoaded: boolean;
  setCurrency: (code: CurrencyCode, byUser?: boolean) => void;
  loadRates: () => Promise<void>;
  addCurrency: (code: string, rate: number, symbol: string) => Promise<void>;
  setRate: (code: string, rate: number) => Promise<void>;
  setSymbol: (code: string, symbol: string) => Promise<void>;
  removeCurrency: (code: string) => Promise<void>;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: "USD",
      userSelected: false,
      rates: { INR: 1, USD: 83.5 }, // safe fallback until loadRates() resolves
      symbols: { INR: "₹", USD: "$" },
      currencies: [INR_META, { code: "USD", symbol: "$", label: "US Dollar", locale: "en-US" }],
      ratesLoaded: false,

      setCurrency: (code, byUser = false) =>
        set({ currency: code, ...(byUser ? { userSelected: true } : {}) }),

      loadRates: async () => {
        if (get().ratesLoaded) return;
        try {
          const rows = await fetchCurrencyRates();
          const rates: Record<string, number> = { INR: 1 };
          const symbols: Record<string, string> = { INR: "₹" };
          rows.forEach((r) => {
            rates[r.code] = r.rate;
            symbols[r.code] = r.symbol;
          });
          set({ rates, symbols, currencies: [INR_META, ...rows.map(toMeta)], ratesLoaded: true });
        } catch {
          // keep fallback defaults; next mount will retry
        }
      },

      addCurrency: async (code, rate, symbol) => {
        const created = await createCurrencyRate(code, rate, symbol);
        set((state) => ({
          rates: { ...state.rates, [created.code]: created.rate },
          symbols: { ...state.symbols, [created.code]: created.symbol },
          currencies: [...state.currencies, toMeta(created)],
        }));
      },

      setRate: async (code, rate) => {
        const updated = await updateCurrencyRate(code, { rate });
        set((state) => ({ rates: { ...state.rates, [updated.code]: updated.rate } }));
      },

      setSymbol: async (code, symbol) => {
        const updated = await updateCurrencyRate(code, { symbol });
        set((state) => ({
          symbols: { ...state.symbols, [updated.code]: updated.symbol },
          currencies: state.currencies.map((c) => (c.code === updated.code ? { ...c, symbol: updated.symbol } : c)),
        }));
      },

      removeCurrency: async (code) => {
        await deleteCurrencyRate(code);
        set((state) => ({
          rates: Object.fromEntries(Object.entries(state.rates).filter(([c]) => c !== code)),
          symbols: Object.fromEntries(Object.entries(state.symbols).filter(([c]) => c !== code)),
          currencies: state.currencies.filter((c) => c.code !== code),
        }));
      },
    }),
    {
      name: "numen-currency",
      partialize: (state) => ({ currency: state.currency, userSelected: state.userSelected }),
    }
  )
);