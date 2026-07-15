import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export interface CatalogProduct {
  name: string;
  slug: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  colors: string[];
  sizes: string[];
  stockStatus: string;
  rating: number;
  isNew: boolean;
}

function stockStatus(stock: number) {
  if (stock === 0) return "out of stock";
  if (stock <= 5) return `low stock (${stock} left)`;
  return "in stock";
}

interface PreparedProduct {
  weightedTermCounts: Map<string, number>;
  length: number;
}

/**
 * BM25 ranking over a lightly-weighted concatenation of product fields.
 * Name matches count 3x, category 2x, colors/sizes 1x — so "black jacket"
 * correctly ranks an actual jacket above a product that merely mentions
 * "black" somewhere in metadata. Better ranking than a flat substring count
 * means we can safely return fewer, more reliable results (5 instead of 8),
 * which directly reduces tokens sent to the model per tool call.
 */
function bm25Rank(products: PreparedProduct[], terms: string[], k1 = 1.5, b = 0.75): number[] {
  const N = products.length;
  const avgLen = products.reduce((sum, p) => sum + p.length, 0) / (N || 1);

  const df = new Map<string, number>(); // document frequency per term
  for (const term of terms) {
    let count = 0;
    for (const p of products) if (p.weightedTermCounts.has(term)) count++;
    df.set(term, count);
  }

  return products.map((p) => {
    let score = 0;
    for (const term of terms) {
      const freq = p.weightedTermCounts.get(term) ?? 0;
      if (freq === 0) continue;
      const idf = Math.log(1 + (N - (df.get(term) ?? 0) + 0.5) / ((df.get(term) ?? 0) + 0.5));
      const norm = (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * (p.length / avgLen)));
      score += idf * norm;
    }
    return score;
  });
}

export async function searchCatalog(query: string): Promise<CatalogProduct[]> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const products = await prisma.product.findMany({
    include: { category: true },
    take: 300,
  });

  const prepared = products.map((p) => {
    const colors = Array.isArray(p.colors) ? (p.colors as { name: string }[]).map((c) => c.name) : [];

    const nameTerms = p.name.toLowerCase().split(/\s+/).filter(Boolean);
    const categoryTerms = p.category.name.toLowerCase().split(/\s+/).filter(Boolean);
    const otherTerms = [...colors, ...p.sizes].join(" ").toLowerCase().split(/\s+/).filter(Boolean);

    const weightedTermCounts = new Map<string, number>();
    const addTerms = (list: string[], weight: number) => {
      for (const t of list) weightedTermCounts.set(t, (weightedTermCounts.get(t) ?? 0) + weight);
    };
    addTerms(nameTerms, 3);
    addTerms(categoryTerms, 2);
    addTerms(otherTerms, 1);

    const length = nameTerms.length * 3 + categoryTerms.length * 2 + otherTerms.length;

    return { p, colors, weightedTermCounts, length };
  });

  const scores = bm25Rank(prepared, terms);

  const scored = prepared
    .map((entry, i) => ({ p: entry.p, colors: entry.colors, score: scores[i] }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating)
    .slice(0, 5); // trimmed from 8 — BM25 makes the top few genuinely reliable

  return scored.map(({ p, colors }) => ({
    name: p.name,
    slug: p.slug,
    category: p.category.name,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : undefined,
    colors,
    sizes: p.sizes,
    stockStatus: stockStatus(p.stock),
    rating: p.rating,
    isNew: p.isNew,
  }));
}

export async function getStorePolicies() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return {
    freeShippingThreshold: settings ? Number(settings.freeShippingThreshold) : 75,
    shippingFee: settings ? Number(settings.shippingFee) : 6.99,
    codFee: settings ? Number(settings.codFee) : 2,
    returnWindowDays: 30, // not modeled in schema — static policy
  };
}

/** Whitelisted fields only — never spread the raw User row into a prompt. */
export function serializeCustomerProfile(user: User) {
  return {
    name: user.name ?? undefined,
    sizeTop: user.sizeTop ?? undefined,
    sizeBottom: user.sizeBottom ?? undefined,
    sizeShoe: user.sizeShoe ?? undefined,
    styleTags: user.styleTags,
    favoriteCategories: user.favoriteCategories,
  };
}

export async function getCustomerOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    take: 5,
    include: { items: { select: { name: true, qty: true } } },
  });
  return orders.map((o) => ({
    id: o.id,
    status: o.status,
    total: Number(o.total),
    placedAt: o.placedAt.toISOString(),
    items: o.items.map((i) => `${i.qty}× ${i.name}`),
  }));
}