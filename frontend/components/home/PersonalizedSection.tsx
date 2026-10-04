"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/src/types";
import { decayedScore, ensureInterestHydrated, useInterestStore, type ScoreEntry } from "@/src/hooks/useInterestStore";
import { useWishlistStore } from "@/src/hooks/useWishlistStore";
import { fetchProfile } from "@/src/lib/profile";
import ProductCard from "@/components/ProductCard";

const EXPLORE_SLOTS = 2; // slots reserved for fresh items outside the user's top categories

interface Args {
  products: Product[]; // candidate pool (newest first)
  scores: Record<string, ScoreEntry>;
  favoriteCategories: string[];
  wishlistIds: (string | number)[];
  recentProductIds: string[];
  limit?: number;
}

/**
 * Returns a personalised list, or null when there's no signal yet.
 *
 * - Category weight = decayed behaviour score + profile favourites (+4) +
 *   wishlisted items in that category (+3 each).
 * - The top 4 categories share the personal slots proportionally (D'Hondt
 *   allocation), so the strongest interest dominates but isn't the only thing shown.
 * - Already-viewed items sink to the back of each category; wishlisted ones are hidden.
 * - A couple of "explore" slots keep the feed from becoming an echo chamber.
 */
export function buildPersonalizedList({
  products,
  scores,
  favoriteCategories,
  wishlistIds,
  recentProductIds,
  limit = 8,
}: Args): Product[] | null {
  const now = Date.now();
  const weights = new Map<string, number>();
  const add = (slug: string, w: number) => weights.set(slug, (weights.get(slug) ?? 0) + w);

  for (const [slug, entry] of Object.entries(scores)) add(slug, decayedScore(entry, now));
  for (const slug of favoriteCategories) add(slug, 4);

  const wishSet = new Set(wishlistIds.map(String));
  for (const p of products) if (wishSet.has(String(p.id))) add(p.categorySlug, 3);

  const ranked = [...weights.entries()]
    .filter(([, w]) => w > 0.25)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  if (ranked.length === 0) return null;

  const recent = new Set(recentProductIds);
  const rank = (p: Product) => (recent.has(String(p.id)) ? 2 : 0) + (p.isNew ? 0 : 1);

  const queues = new Map<string, Product[]>();
  for (const p of products) {
    const q = queues.get(p.categorySlug);
    if (q) q.push(p);
    else queues.set(p.categorySlug, [p]);
  }
  for (const q of queues.values()) q.sort((a, b) => rank(a) - rank(b)); // stable

  const picked: Product[] = [];
  const pickedIds = new Set<string>();
  const taken = new Map<string, number>();
  const cursor = new Map<string, number>();
  const personalSlots = Math.max(1, limit - EXPLORE_SLOTS);

  while (picked.length < personalSlots) {
    let best: string | null = null;
    let bestScore = -1;

    for (const [slug, w] of ranked) {
      const q = queues.get(slug) ?? [];
      let i = cursor.get(slug) ?? 0;
      while (i < q.length && (wishSet.has(String(q[i].id)) || pickedIds.has(String(q[i].id)))) i++;
      cursor.set(slug, i);
      if (i >= q.length) continue;

      const d = w / ((taken.get(slug) ?? 0) + 1);
      if (d > bestScore) {
        bestScore = d;
        best = slug;
      }
    }
    if (!best) break;

    const i = cursor.get(best)!;
    const p = queues.get(best)![i];
    picked.push(p);
    pickedIds.add(String(p.id));
    taken.set(best, (taken.get(best) ?? 0) + 1);
    cursor.set(best, i + 1);
  }

  const topSlugs = new Set(ranked.map(([slug]) => slug));
  const explore = products
    .filter((p) => !pickedIds.has(String(p.id)) && !wishSet.has(String(p.id)))
    .sort(
      (a, b) =>
        (topSlugs.has(a.categorySlug) ? 1 : 0) +
        (a.isNew ? 0 : 2) -
        ((topSlugs.has(b.categorySlug) ? 1 : 0) + (b.isNew ? 0 : 2))
    );

  for (const p of explore) {
    if (picked.length >= limit) break;
    picked.push(p);
  }

  return picked.length > 0 ? picked : null;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface PersonalizedSectionProps {
  products: Product[];
  limit?: number;
}

const NONE: string[] = [];

export default function PersonalizedSection({ products, limit = 8 }: PersonalizedSectionProps) {
  const scores = useInterestStore((s) => s.scores);
  const recentProductIds = useInterestStore((s) => s.recentProductIds);
  const hydrated = useInterestStore((s) => s.hydrated);
  const wishlistIds = useWishlistStore((s) => s.productIds);

  const [favoriteCategories, setFavoriteCategories] = useState<string[]>(NONE);

  // Page is statically cached: load localStorage data only after mount so the
  // server HTML and first client render match.
  useEffect(() => {
    ensureInterestHydrated();
  }, []);

  // Profile favourites only exist for logged-in users; guests just fail
  // silently and rely on behaviour scores.
  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((p) => {
        if (!cancelled && Array.isArray(p?.favoriteCategories)) setFavoriteCategories(p.favoriteCategories);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const list = useMemo(() => {
    if (!hydrated) return null;
    return buildPersonalizedList({
      products,
      scores,
      favoriteCategories,
      wishlistIds,
      recentProductIds,
      limit,
    });
  }, [hydrated, products, scores, favoriteCategories, wishlistIds, recentProductIds, limit]);

  if (!list || list.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-12">
      <h2 className="mb-6 font-display text-2xl font-bold text-ink">Picked for you</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}