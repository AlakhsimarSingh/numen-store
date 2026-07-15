import { create } from "zustand";
import { toggleWishlistItem, fetchWishlist } from "@/src/lib/wishlist";

interface WishlistState {
  productIds: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggle: (id: string) => Promise<void>;
  has: (id: string) => boolean;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  productIds: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { productIds } = await fetchWishlist();
      set({ productIds, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  toggle: async (id) => {
    // Optimistic update — flip locally first, then confirm with the server.
    const current = get().productIds;
    const wasWishlisted = current.includes(id);
    set({ productIds: wasWishlisted ? current.filter((p) => p !== id) : [...current, id] });

    try {
      await toggleWishlistItem(id);
    } catch {
      // Revert on failure.
      set({ productIds: current });
    }
  },
  has: (id) => get().productIds.includes(id),
}));