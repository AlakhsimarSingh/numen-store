import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_ITEMS = 10;

interface RecentlyViewedState {
  productIds: string[];
  addView: (productId: string) => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      productIds: [],
      addView: (productId) =>
        set((state) => {
          const withoutCurrent = state.productIds.filter((id) => id !== productId);
          return { productIds: [productId, ...withoutCurrent].slice(0, MAX_ITEMS) };
        }),
    }),
    { name: "numen-recently-viewed" }
  )
);