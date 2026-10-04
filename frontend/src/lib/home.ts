import type { Product } from "@/src/types";
import type { Category } from "@/src/lib/categories";
import { CATEGORY_ORDER } from "@/src/data/categoryOrder";

/**
 * Runs on the SERVER. Previously every client component received the full
 * product list (serialized into the page 3x) and CategoryGrid re-did all this
 * filtering/sorting in the browser after a second network round-trip.
 */

function orderRank(category: Category): number {
  const name = category.name.toLowerCase();
  const idx = CATEGORY_ORDER.findIndex((key) => name.includes(key));
  return idx === -1 ? CATEGORY_ORDER.length : idx;
}

export interface CategorySection {
  category: Category;
  products: Product[];
}

export function buildCategorySections(categories: Category[], products: Product[]): CategorySection[] {
  const bySlug = new Map<string, Product[]>();
  for (const p of products) {
    const list = bySlug.get(p.categorySlug);
    if (!list) bySlug.set(p.categorySlug, [p]);
    else if (list.length < 4) list.push(p);
  }

  return [...categories]
    .sort((a, b) => {
      const rankDiff = orderRank(a) - orderRank(b);
      return rankDiff !== 0 ? rankDiff : b.productCount - a.productCount;
    })
    .map((category) => ({ category, products: bySlug.get(category.slug) ?? [] }))
    .filter((s) => s.products.length > 0);
}

/** Hero only ever shows 5 products. */
export function buildHeroProducts(products: Product[]): Product[] {
  const spotlighted = products.filter((p) => p.isSpotlight);
  return (spotlighted.length > 0 ? spotlighted : products).slice(0, 5);
}

/**
 * Candidate pool for the personalised section: up to `perCategory` items from
 * every category plus the newest items. Personalisation only needs to choose
 * 8 items, so shipping the whole catalogue to the browser is wasted bytes.
 */
export function buildPersonalizationPool(products: Product[], perCategory = 8): Product[] {
  const counts = new Map<string, number>();
  const pool = new Map<string | number, Product>();
  let newCount = 0;

  for (const p of products) {
    const n = counts.get(p.categorySlug) ?? 0;
    if (n < perCategory) {
      counts.set(p.categorySlug, n + 1);
      pool.set(p.id, p);
    }
    if (p.isNew && newCount < 16) {
      newCount++;
      pool.set(p.id, p);
    }
  }
  return [...pool.values()];
}