import { create } from "zustand";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: "CUSTOMER" | "ADMIN";
}

interface AuthState {
  isLoggedIn: boolean;
  user: AuthUser | null;
  hydrated: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  fetchSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  user: null,
  hydrated: false,
  login: (user) => set({ isLoggedIn: true, user }),
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Even if the network call fails, clear local state so the UI
      // doesn't show a logged-in user who can't actually act as one.
    }
    set({ isLoggedIn: false, user: null });
  },
  fetchSession: async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (data.user) {
        set({ isLoggedIn: true, user: data.user, hydrated: true });
      } else {
        set({ isLoggedIn: false, user: null, hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));