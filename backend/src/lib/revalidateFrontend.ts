export type FrontendCacheTag = "products" | "categories" | "flash-deal" | "testimonials" | "site-settings";

export const FRONTEND_CACHE_TAGS: FrontendCacheTag[] = [
  "products",
  "categories",
  "flash-deal",
  "testimonials",
  "site-settings",
];

/**
 * Tells the storefront to refresh its cached data right away.
 * Call it (without awaiting) after an admin create/update/delete:
 *
 *   void revalidateFrontend(["products", "categories"]);
 *
 * Never throws and gives up after 3s, so it can't slow down or break an admin
 * request. Returns whether the storefront accepted the purge. If it fails, the
 * storefront still refreshes on its own within 30-60 seconds.
 *
 * Env (backend): FRONTEND_URL (e.g. https://numen.example.com), REVALIDATE_SECRET
 * (same value as on the frontend).
 */
export async function revalidateFrontend(tags: FrontendCacheTag[]): Promise<boolean> {
  const base = process.env.FRONTEND_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret || tags.length === 0) return false;

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}