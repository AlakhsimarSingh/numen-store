/**
 * Cache tags used by the storefront's server-side fetches.
 * The backend refreshes them through POST /api/revalidate (see
 * backend/app/api/revalidate/route.ts -> frontend/app/api/revalidate/route.ts).
 */
export const CACHE_TAGS = {
  products: "products",
  categories: "categories",
  flashDeal: "flash-deal",
  testimonials: "testimonials",
  siteSettings: "site-settings",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const CACHE_TAG_LIST: CacheTag[] = Object.values(CACHE_TAGS);