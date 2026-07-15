import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchSiteSettings } from "@/src/lib/site-settings";

interface SiteSettingsState {
  siteName: string;
  tagline: string;
  heroHeadlineLines: string[];
  heroSubtext: string;
  heroImage: string;
  freeShippingThreshold: number;
  shippingFee: number;
  taxRate: number;
  codFee: number;
  announcementEnabled: boolean;
  announcementText: string;
  maintenanceMode: boolean;
  update: (updates: Partial<Omit<SiteSettingsState, "update" | "fetchFromServer">>) => void;
  fetchFromServer: () => Promise<void>;
}

export const useSiteSettingsStore = create<SiteSettingsState>()(
  persist(
    (set) => ({
      siteName: "NUMEN.",
      tagline: "Wear the Drop",
      heroHeadlineLines: ["WEAR", "THE", "DROP."],
      heroSubtext: "26 categories. Zero filler. Premium fits at prices that don't punish you for having taste.",
      heroImage: "/hero-bg.jpg",
      freeShippingThreshold: 75,
      shippingFee: 6.99,
      taxRate: 0.08,
      codFee: 2,
      announcementEnabled: false,
      announcementText: "Free shipping on orders over ₹75 — today only.",
      maintenanceMode: false,
      update: (updates) => set(updates),
      fetchFromServer: async () => {
        try {
          const data = await fetchSiteSettings();
          set(data as Partial<SiteSettingsState>);
        } catch {
          // Network/server issue — keep whatever's already persisted locally.
        }
      },
    }),
    { name: "numen-site-settings" }
  )
);