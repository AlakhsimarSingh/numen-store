import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "@/src/types";

export interface ShippingInfo {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
}

export type PaymentMethodId = "card" | "upi" | "cod";
export type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface ReturnRequest {
  reason: string;
  comment: string;
  requestedAt: string;
  status: "requested" | "approved" | "rejected";
}

export interface OrderSnapshot {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  codFee: number;
  total: number;
  shipping: ShippingInfo;
  paymentMethod: PaymentMethodId;
  paymentStatus: PaymentStatus;
  placedAt: string;
  status: OrderStatus;
  returnRequest?: ReturnRequest;
}

interface CheckoutState {
  shipping: ShippingInfo | null;
  paymentMethod: PaymentMethodId | null;
  promoCode: string;
  discountPercent: number;
  lastOrder: OrderSnapshot | null;
  orders: OrderSnapshot[];
  setShipping: (s: ShippingInfo) => void;
  setPaymentMethod: (m: PaymentMethodId) => void;
  applyPromo: (code: string) => Promise<boolean>;
  placeOrder: (order: OrderSnapshot) => void;
  resetCheckout: () => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  requestReturn: (orderId: string, reason: string, comment: string) => void;
  updateReturnStatus: (orderId: string, status: "approved" | "rejected") => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      shipping: null,
      paymentMethod: null,
      promoCode: "",
      discountPercent: 0,
      lastOrder: null,
      orders: [],
      setShipping: (shipping) => set({ shipping }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      applyPromo: async (code) => {
        const trimmed = code.trim();
        if (!trimmed) return false;
        try {
          const res = await fetch("/api/promo-codes/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: trimmed }),
          });
          const data = await res.json();
          if (!res.ok || !data.valid) return false;
          set({ promoCode: data.code, discountPercent: data.percent });
          return true;
        } catch {
          return false;
        }
      },
      placeOrder: (order) => set((state) => ({ lastOrder: order, orders: [order, ...state.orders] })),
      resetCheckout: () => set({ shipping: null, paymentMethod: null, promoCode: "", discountPercent: 0 }),
      updateOrderStatus: (orderId, status) =>
        set((state) => ({ orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)) })),
      requestReturn: (orderId, reason, comment) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? { ...o, returnRequest: { reason, comment, requestedAt: new Date().toISOString(), status: "requested" } }
              : o
          ),
        })),
      updateReturnStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId && o.returnRequest ? { ...o, returnRequest: { ...o.returnRequest, status } } : o
          ),
        })),
    }),
    { name: "numen-checkout" }
  )
);