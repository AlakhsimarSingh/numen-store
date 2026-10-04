"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Behavioural interest signals, stored in localStorage.
 *
 * Every meaningful action nudges a per-category score, so the very FIRST
 * product view / click / add-to-cart already changes what the homepage shows
 * on the next render. Scores decay with a 21-day half-life so old interests
 * fade and new ones take over quickly.
 */
export type InterestEvent = "view" | "click" | "category" | "search" | "wishlist" | "cart";

export const EVENT_WEIGHTS: Record<InterestEvent, number> = {
  click: 2, //     clicked a product card
  view: 3, //      opened a product page
  category: 3, //  opened a category / "View all"
  search: 2, //    searched a term that maps to a category
  wishlist: 5, //  saved it
  cart: 6, //      strongest intent short of buying
};

const MAX_SCORE = 40; // cap so one binge never locks the feed forever
const MAX_RECENT = 30;
const HALF_LIFE_MS = 21 * 24 * 60 * 60 * 1000;

export interface ScoreEntry {
  s: number; // score at time t
  t: number; // last update (ms)
}

export function decayedScore(entry: ScoreEntry | undefined, now: number): number {
  if (!entry) return 0;
  return entry.s * Math.pow(0.5, (now - entry.t) / HALF_LIFE_MS);
}

// Stops the same product/category being counted again and again in one session
// (refreshes, back/forward). Cart adds are deliberately NOT deduped.
const seenThisSession = new Set<string>();

interface InterestState {
  scores: Record<string, ScoreEntry>;
  recentProductIds: string[];
  hydrated: boolean;
  track: (
    categorySlug: string | null | undefined,
    event: InterestEvent,
    productId?: string | number
  ) => void;
}

export const useInterestStore = create<InterestState>()(
  persist(
    (set, get) => ({
      scores: {},
      recentProductIds: [],
      hydrated: false,

      track(categorySlug, event, productId) {
        if (!categorySlug || typeof window === "undefined") return;
        ensureInterestHydrated(); // never overwrite saved data before it's loaded

        if (event !== "cart") {
          const key = `${event}:${productId ?? categorySlug}`;
          if (seenThisSession.has(key)) return;
          seenThisSession.add(key);
        }

        const now = Date.now();
        const { scores, recentProductIds } = get();
        const score = Math.min(MAX_SCORE, decayedScore(scores[categorySlug], now) + EVENT_WEIGHTS[event]);

        let recent = recentProductIds;
        if (productId != null) {
          const id = String(productId);
          recent = [id, ...recentProductIds.filter((x) => x !== id)].slice(0, MAX_RECENT);
        }

        set({ scores: { ...scores, [categorySlug]: { s: score, t: now } }, recentProductIds: recent });
      },
    }),
    {
      name: "numen-interest-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Hydrate manually on the client so server HTML and first client render match.
      skipHydration: true,
      partialize: (s) => ({ scores: s.scores, recentProductIds: s.recentProductIds }),
      onRehydrateStorage: () => () => {
        useInterestStore.setState({ hydrated: true });
      },
    }
  )
);

export function ensureInterestHydrated() {
  if (typeof window === "undefined") return;
  if (!useInterestStore.getState().hydrated) useInterestStore.persist.rehydrate();
}