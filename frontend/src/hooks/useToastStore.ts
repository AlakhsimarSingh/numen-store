import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, variant?: Toast["variant"]) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, variant = "success") =>
    set((state) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return { toasts: [...state.toasts, { id, message, variant }] };
    }),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));