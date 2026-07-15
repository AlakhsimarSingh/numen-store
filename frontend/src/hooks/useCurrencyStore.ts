import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CurrencyCode } from "@/src/types";
import { getCurrencyMeta } from "@/src/lib/currency";
import {
  fetchCurrencyRates,
  createCurrencyRate,
  updateCurrencyRate,
  deleteCurrencyRate,
} from "@/src/lib/currency-rates";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
}

function toMeta(code: CurrencyCode): CurrencyMeta {
  return { code, ...getCurrencyMeta(code) };
}

interface CurrencyState {
  currency: CurrencyCode;
  userSelected: boolean;
  rates: Record<string, number>; // "1 INR = X" — INR itself is always 1 (base currency)
  currencies: CurrencyMeta[];
  ratesLoaded: boolean;
  setCurrency: (code: CurrencyCode, byUser?: boolean) => void;
  loadRates: () => Promise<void>;
  addCurrency: (code: string, rate: number) => Promise<void>;
  setRate: (code: string, rate: number) => Promise<void>;
  removeCurrency: (code: string) => Promise<void>;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: "USD",
      userSelected: false,
      rates: { INR: 1, USD: 0.012 }, // safe fallback until loadRates() resolves
      currencies: [toMeta("INR"), toMeta("USD")],
      ratesLoaded: false,

      setCurrency: (code, byUser = false) =>
        set({ currency: code, ...(byUser ? { userSelected: true } : {}) }),

      loadRates: async () => {
        if (get().ratesLoaded) return;
        try {
          const rows = await fetchCurrencyRates();
          const rates: Record<string, number> = { INR: 1 };
          rows.forEach((r) => {
            rates[r.code] = r.rate;
          });
          set({ rates, currencies: [toMeta("INR"), ...rows.map((r) => toMeta(r.code))], ratesLoaded: true });
        } catch {
          // keep fallback defaults; next mount will retry
        }
      },

      addCurrency: async (code, rate) => {
        const created = await createCurrencyRate(code, rate);
        set((state) => ({
          rates: { ...state.rates, [created.code]: created.rate },
          currencies: [...state.currencies, toMeta(created.code)],
        }));
      },

      setRate: async (code, rate) => {
        const updated = await updateCurrencyRate(code, rate);
        set((state) => ({ rates: { ...state.rates, [updated.code]: updated.rate } }));
      },

      removeCurrency: async (code) => {
        await deleteCurrencyRate(code);
        set((state) => ({
          rates: Object.fromEntries(Object.entries(state.rates).filter(([c]) => c !== code)),
          currencies: state.currencies.filter((c) => c.code !== code),
        }));
      },
    }),
    {
      name: "numen-currency",
      // rates/currencies always come fresh from the backend — only persist the user's choice
      partialize: (state) => ({ currency: state.currency, userSelected: state.userSelected }),
    }
  )
);