import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AdminCategory {
  slug: string;
  name: string;
  iconName: string;
}

const seedCategories: AdminCategory[] = [
  { slug: "bags", name: "Bags", iconName: "Backpack" },
  { slug: "belts", name: "Belts", iconName: "Package" },
  { slug: "caps", name: "Caps", iconName: "HardHat" },
  { slug: "cargo-pants", name: "Cargo Pants", iconName: "Layers" },
  { slug: "face-mask", name: "Face Mask", iconName: "Wind" },
  { slug: "formal-shoes", name: "Formal Shoes", iconName: "Footprints" },
  { slug: "girls-heels", name: "Girls Heels", iconName: "Sparkles" },
  { slug: "jackets", name: "Jackets", iconName: "Shirt" },
  { slug: "jeans", name: "Jeans", iconName: "Layers" },
  { slug: "ladies-bags", name: "Ladies Bags", iconName: "ShoppingBag" },
  { slug: "lowers", name: "Lowers", iconName: "Layers" },
  { slug: "outfits", name: "Outfits", iconName: "Star" },
  { slug: "pants", name: "Pants", iconName: "Layers" },
  { slug: "perfumes", name: "Perfumes & Deos", iconName: "Droplet" },
  { slug: "pullovers", name: "Pullovers", iconName: "Shirt" },
  { slug: "sandos", name: "Sandos / Tank Tops", iconName: "Shirt" },
  { slug: "shades", name: "Shades", iconName: "Glasses" },
  { slug: "shirts", name: "Shirts", iconName: "Shirt" },
  { slug: "shoes", name: "Shoes", iconName: "Footprints" },
  { slug: "shorts", name: "Shorts", iconName: "Shirt" },
  { slug: "slippers", name: "Slippers", iconName: "Footprints" },
  { slug: "socks", name: "Socks", iconName: "Footprints" },
  { slug: "tie", name: "Tie", iconName: "Award" },
  { slug: "tracksuits", name: "Tracksuits", iconName: "Shirt" },
  { slug: "tshirts", name: "T-Shirts", iconName: "Shirt" },
  { slug: "wallets", name: "Wallets", iconName: "Wallet" },
  { slug: "watches", name: "Watches", iconName: "Watch" },
];

interface AdminCategoriesState {
  categories: AdminCategory[];
  addCategory: (c: AdminCategory) => void;
  updateCategory: (slug: string, updates: Partial<AdminCategory>) => void;
  removeCategory: (slug: string) => void;
}

export const useAdminCategoriesStore = create<AdminCategoriesState>()(
  persist(
    (set) => ({
      categories: seedCategories,
      addCategory: (c) => set((state) => ({ categories: [...state.categories, c] })),
      updateCategory: (slug, updates) =>
        set((state) => ({
          categories: state.categories.map((cat) => (cat.slug === slug ? { ...cat, ...updates } : cat)),
        })),
      removeCategory: (slug) => set((state) => ({ categories: state.categories.filter((c) => c.slug !== slug) })),
    }),
    { name: "numen-admin-categories" }
  )
);