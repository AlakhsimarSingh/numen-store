import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PromoCode {
  code: string;
  percent: number;
  active: boolean;
}

interface PromoState {
  promoCodes: PromoCode[];
  addPromo: (p: PromoCode) => void;
  updatePromo: (code: string, updates: Partial<PromoCode>) => void;
  removePromo: (code: string) => void;
}

export const usePromoStore = create<PromoState>()(
  persist(
    (set) => ({
      promoCodes: [
        { code: "NUMEN10", percent: 10, active: true },
        { code: "WELCOME15", percent: 15, active: true },
      ],
      addPromo: (p) => set((state) => ({ promoCodes: [{ ...p, code: p.code.toUpperCase() }, ...state.promoCodes] })),
      updatePromo: (code, updates) =>
        set((state) => ({
          promoCodes: state.promoCodes.map((p) => (p.code === code ? { ...p, ...updates } : p)),
        })),
      removePromo: (code) => set((state) => ({ promoCodes: state.promoCodes.filter((p) => p.code !== code) })),
    }),
    { name: "numen-promo-codes" }
  )
);