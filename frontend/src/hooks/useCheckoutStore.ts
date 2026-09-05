import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "@/src/types";
import { ShippingZone } from "@/src/lib/shipping";

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
  currency: string;
  shipping: ShippingInfo;
  paymentMethod: PaymentMethodId;
  paymentStatus: PaymentStatus;
  placedAt: string;
  status: OrderStatus;
  returnRequest?: ReturnRequest;
}

// The real, locked-in totals computed on the Payment page — weight- and
// destination-aware shipping, the payment-method-specific COD fee, and
// whatever promo discount was valid at that moment. Review reads this
// rather than recomputing, so the number the shopper confirms and pays is
// exactly what gets billed and recorded — it can't silently drift if
// settings/rates change between the Payment and Review steps.
export interface ConfirmedTotals {
  subtotal: number;
  discount: number;
  shippingFee: number;
  shippingZone: ShippingZone | null;
  tax: number;
  codFee: number;
  total: number;
  totalWeightKg: number;
  destinationPincode: string | null;
}

interface CheckoutState {
  shipping: ShippingInfo | null;
  paymentMethod: PaymentMethodId | null;
  promoCode: string;
  discountPercent: number;
  // Display name of the partner tied to the current promoCode, e.g. "Acme
  // Retailers" — set alongside promoCode so checkout steps after Cart can
  // show "Connected with X" without re-fetching. Empty when no code is
  // applied, or when a code has no associated business name.
  promoBusinessName: string;
  promoRevalidating: boolean;
  confirmedTotals: ConfirmedTotals | null;
  lastOrder: OrderSnapshot | null;
  orders: OrderSnapshot[];
  setShipping: (s: ShippingInfo) => void;
  setPaymentMethod: (m: PaymentMethodId) => void;
  applyPromo: (code: string) => Promise<boolean>;
  revalidatePromo: () => Promise<void>;
  clearPromo: () => void;
  setConfirmedTotals: (totals: ConfirmedTotals) => void;
  placeOrder: (order: OrderSnapshot) => void;
  resetCheckout: () => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  requestReturn: (orderId: string, reason: string, comment: string) => void;
  updateReturnStatus: (orderId: string, status: "approved" | "rejected") => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      shipping: null,
      paymentMethod: null,
      promoCode: "",
      discountPercent: 0,
      promoBusinessName: "",
      promoRevalidating: false,
      confirmedTotals: null,
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
          set({ promoCode: data.code, discountPercent: data.percent, promoBusinessName: data.businessName ?? "" });
          return true;
        } catch {
          return false;
        }
      },
      // Re-checks whatever promo code is currently stored against the
      // server every time it's called. Covers back-button navigation into
      // the cart, a fresh visit days later, or arriving after adding an
      // item elsewhere — a code that was valid when first applied but has
      // since expired, been deactivated, or hit its usage cap gets cleared
      // here instead of silently continuing to apply a stale discount.
      revalidatePromo: async () => {
        const code = get().promoCode;
        if (!code) return;
        set({ promoRevalidating: true });
        try {
          const res = await fetch("/api/promo-codes/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          const data = await res.json();
          if (!res.ok || !data.valid) {
            set({ promoCode: "", discountPercent: 0, promoBusinessName: "" });
          } else {
            set({ promoCode: data.code, discountPercent: data.percent, promoBusinessName: data.businessName ?? "" });
          }
        } catch {
          // Network hiccup — don't punish the customer for a transient
          // failure by clearing a promo that might still be valid; it'll
          // simply be re-checked on the next visit.
        } finally {
          set({ promoRevalidating: false });
        }
      },
      // Manual removal, triggered by the customer (e.g. an "×" next to the
      // applied-code confirmation on the cart page) — unlike
      // revalidatePromo, this doesn't hit the server at all, since intent
      // here is simply "I don't want this code anymore," not "check if
      // it's still valid."
      clearPromo: () => set({ promoCode: "", discountPercent: 0, promoBusinessName: "" }),
      setConfirmedTotals: (confirmedTotals) => set({ confirmedTotals }),
      placeOrder: (order) => set((state) => ({ lastOrder: order, orders: [order, ...state.orders] })),
      resetCheckout: () =>
        set({
          shipping: null,
          paymentMethod: null,
          promoCode: "",
          discountPercent: 0,
          promoBusinessName: "",
          confirmedTotals: null,
        }),
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