import { LucideIcon } from "lucide-react";

export type CurrencyCode = string;

export interface RegionalPrice {
  price: number;
  compareAtPrice?: number;
}

export interface Category {
  slug: string;
  name: string;
  icon: LucideIcon;
}

export interface ColorOption {
  name: string;
  hex: string;
  images: string[];
  video?: string;
}

export interface VariantStockEntry {
  color: string;
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  images: string[];
  video?: string;
  stock: number;
  weight: number; // kg — used to estimate domestic shipping cost
  isNew: boolean;
  isSpotlight: boolean;
  rating: number;
  colors?: ColorOption[];
  sizes?: string[];
  variantStock?: VariantStockEntry[];
  regionalPrices?: Partial<Record<CurrencyCode, RegionalPrice>>;
}

export interface CartItem {
  productId: string;
  baseId: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  regionalPrices?: Partial<Record<CurrencyCode, RegionalPrice>>;
  image: string;
  weight: number; // kg, captured from the product at add-to-cart time
  qty: number;
  color?: string;
  size?: string;
}

export interface LookHotspot {
  id: string;
  productId: string;
  xPercent: number;
  yPercent: number;
  defaultColor?: string;
  defaultSize?: string;
  label?: string;
  product: Product;
}

export interface Look {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  image: string;
  active: boolean;
  order: number;
  hotspots: LookHotspot[];
}