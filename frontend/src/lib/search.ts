import Fuse from "fuse.js";
import { Product } from "@/src/types";

export interface SearchIndex {
  fuse: Fuse<Product>;
  colorVocab: Set<string>;
  sizeVocab: Set<string>;
}

/** Rebuilt whenever the product list changes — cheap at catalog sizes up to a few thousand. */
export function buildSearchIndex(products: Product[]): SearchIndex {
  const colorVocab = new Set<string>();
  const sizeVocab = new Set<string>();

  for (const p of products) {
    p.colors?.forEach((c) => colorVocab.add(c.name.toLowerCase()));
    p.sizes?.forEach((s) => sizeVocab.add(s.toLowerCase()));
  }

  const fuse = new Fuse(products, {
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: "name", weight: 0.7 },
      { name: "categorySlug", weight: 0.3 },
    ],
  });

  return { fuse, colorVocab, sizeVocab };
}

export interface ParsedQuery {
  freeText: string;
  sizeTokens: string[];
  colorTokens: string[];
}

export function parseQuery(query: string, index: SearchIndex): ParsedQuery {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const sizeTokens: string[] = [];
  const colorTokens: string[] = [];
  const freeTokens: string[] = [];

  for (const t of tokens) {
    if (index.sizeVocab.has(t)) {
      sizeTokens.push(t);
    } else if (index.colorVocab.has(t)) {
      colorTokens.push(t);
    } else {
      freeTokens.push(t);
    }
  }

  return { freeText: freeTokens.join(" "), sizeTokens, colorTokens };
}

export interface MatchedColor {
  name: string;
  hex: string;
  stock?: number; // undefined = stock not tracked per-variant for this product
}

export interface MatchedSize {
  size: string;
  stock?: number;
}

export interface SearchResult {
  product: Product;
  matchedColors: MatchedColor[];
  matchedSizes: MatchedSize[];
}

function stockForColor(product: Product, colorName: string): number | undefined {
  if (!product.variantStock) return undefined;
  return product.variantStock
    .filter((v) => v.color === colorName)
    .reduce((sum, v) => sum + v.stock, 0);
}

function stockForSize(product: Product, size: string): number | undefined {
  if (!product.variantStock) return undefined;
  return product.variantStock
    .filter((v) => v.size === size)
    .reduce((sum, v) => sum + v.stock, 0);
}

export function searchProducts(query: string, products: Product[], index: SearchIndex, limit = 8): SearchResult[] {
  const { freeText, sizeTokens, colorTokens } = parseQuery(query, index);

  let candidates: Product[] = freeText.length > 0 ? index.fuse.search(freeText).map((r) => r.item) : products;

  if (sizeTokens.length > 0) {
    candidates = candidates.filter((p) => sizeTokens.every((sz) => p.sizes?.some((s) => s.toLowerCase() === sz)));
  }

  if (colorTokens.length > 0) {
    candidates = candidates.filter((p) =>
      colorTokens.every((c) => p.colors?.some((co) => co.name.toLowerCase().includes(c)))
    );
  }

  if (freeText.length === 0) {
    candidates = [...candidates].sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.rating - a.rating);
  }

  return candidates.slice(0, limit).map((product) => {
    const matchedColors: MatchedColor[] =
      colorTokens.length > 0
        ? (product.colors ?? [])
            .filter((c) => colorTokens.some((t) => c.name.toLowerCase().includes(t)))
            .map((c) => ({ name: c.name, hex: c.hex, stock: stockForColor(product, c.name) }))
        : [];

    const matchedSizes: MatchedSize[] =
      sizeTokens.length > 0
        ? (product.sizes ?? [])
            .filter((s) => sizeTokens.includes(s.toLowerCase()))
            .map((s) => ({ size: s, stock: stockForSize(product, s) }))
        : [];

    return { product, matchedColors, matchedSizes };
  });
}