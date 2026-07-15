import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
}

export interface SavedPaymentMethod {
  id: string;
  type: "card" | "upi";
  label: string;
  isDefault: boolean;
}

export interface SizeProfile {
  top: string;
  bottom: string;
  shoe: string;
}

export interface NotificationPrefs {
  emailDeals: boolean;
  smsDeals: boolean;
  orderUpdates: boolean;
  newDrops: boolean;
}

interface ProfileState {
  phone: string;
  gender: string;
  dob: string;
  sizes: SizeProfile;
  favoriteCategories: string[];
  styleTags: string[];
  notifications: NotificationPrefs;
  addresses: SavedAddress[];
  paymentMethods: SavedPaymentMethod[];
  setPersonal: (data: { phone: string; gender: string; dob: string }) => void;
  setSizes: (sizes: SizeProfile) => void;
  toggleCategory: (slug: string) => void;
  toggleStyleTag: (tag: string) => void;
  setNotification: (key: keyof NotificationPrefs, value: boolean) => void;
  addAddress: (address: Omit<SavedAddress, "id">) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  addPaymentMethod: (method: Omit<SavedPaymentMethod, "id">) => void;
  removePaymentMethod: (id: string) => void;
  setDefaultPaymentMethod: (id: string) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      phone: "",
      gender: "",
      dob: "",
      sizes: { top: "", bottom: "", shoe: "" },
      favoriteCategories: [],
      styleTags: [],
      notifications: { emailDeals: true, smsDeals: false, orderUpdates: true, newDrops: true },
      addresses: [],
      paymentMethods: [],

      setPersonal: (data) => set(data),
      setSizes: (sizes) => set({ sizes }),

      toggleCategory: (slug) =>
        set((state) => ({
          favoriteCategories: state.favoriteCategories.includes(slug)
            ? state.favoriteCategories.filter((c) => c !== slug)
            : [...state.favoriteCategories, slug],
        })),

      toggleStyleTag: (tag) =>
        set((state) => ({
          styleTags: state.styleTags.includes(tag)
            ? state.styleTags.filter((t) => t !== tag)
            : [...state.styleTags, tag],
        })),

      setNotification: (key, value) =>
        set((state) => ({ notifications: { ...state.notifications, [key]: value } })),

      addAddress: (address) =>
        set((state) => {
          const id = `addr-${Date.now()}`;
          const isFirst = state.addresses.length === 0;
          const makeDefault = address.isDefault || isFirst;
          return {
            addresses: [
              ...state.addresses.map((a) => (makeDefault ? { ...a, isDefault: false } : a)),
              { ...address, id, isDefault: makeDefault },
            ],
          };
        }),

      removeAddress: (id) => set((state) => ({ addresses: state.addresses.filter((a) => a.id !== id) })),

      setDefaultAddress: (id) =>
        set((state) => ({ addresses: state.addresses.map((a) => ({ ...a, isDefault: a.id === id })) })),

      addPaymentMethod: (method) =>
        set((state) => {
          const id = `pm-${Date.now()}`;
          const isFirst = state.paymentMethods.length === 0;
          const makeDefault = method.isDefault || isFirst;
          return {
            paymentMethods: [
              ...state.paymentMethods.map((p) => (makeDefault ? { ...p, isDefault: false } : p)),
              { ...method, id, isDefault: makeDefault },
            ],
          };
        }),

      removePaymentMethod: (id) =>
        set((state) => ({ paymentMethods: state.paymentMethods.filter((p) => p.id !== id) })),

      setDefaultPaymentMethod: (id) =>
        set((state) => ({
          paymentMethods: state.paymentMethods.map((p) => ({ ...p, isDefault: p.id === id })),
        })),
    }),
    { name: "numen-profile" }
  )
);