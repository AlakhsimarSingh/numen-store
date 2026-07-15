import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Product } from "@/src/types";

interface CartState {
  items: CartItem[];
  addItem: (product: Product, qty?: number, variant?: { color?: string; size?: string }) => void;
  removeItem: (lineId: string) => void;
  updateQty: (lineId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

function buildLineId(productId: string, variant?: { color?: string; size?: string }) {
  if (!variant || (!variant.color && !variant.size)) return productId;
  return `${productId}::${variant.color ?? "-"}::${variant.size ?? "-"}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, qty = 1, variant) =>
        set((state) => {
          const lineId = buildLineId(product.id, variant);
          const existing = state.items.find((i) => i.productId === lineId);
          if (existing) {
            return {
              items: state.items.map((i) => (i.productId === lineId ? { ...i, qty: i.qty + qty } : i)),
            };
          }
          const displayName =
            variant?.color || variant?.size
              ? `${product.name} — ${[variant.color, variant.size].filter(Boolean).join(" / ")}`
              : product.name;
          return {
            items: [
              ...state.items,
              {
                productId: lineId,
                baseId: product.id,
                name: displayName,
                price: product.price,
                image: product.image,
                qty,
                color: variant?.color,
                size: variant?.size,
              },
            ],
          };
        }),
      removeItem: (lineId) => set((state) => ({ items: state.items.filter((i) => i.productId !== lineId) })),
      updateQty: (lineId, qty) =>
        set((state) => ({
          items: state.items.map((i) => (i.productId === lineId ? { ...i, qty } : i)),
        })),
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
    }),
    { name: "numen-cart" }
  )
);