import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { revalidateFrontend, FRONTEND_CACHE_TAGS, type FrontendCacheTag } from "@/lib/revalidateFrontend";

/**
 * POST /api/revalidate  (admin only)
 * body: { "tags"?: ["products", "categories", ...] }  — omit to refresh everything.
 *
 * Relays the request to the storefront (frontend/app/api/revalidate/route.ts),
 * where the cache actually lives. Useful for a "Refresh storefront" button in
 * the admin panel. Backend routes that change data should call
 * revalidateFrontend() directly instead of going through this endpoint.
 */
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  // Any non-customer account (admin/staff). Tighten to `=== "ADMIN"` if you only want admins.
  if (!user || user.role === "CUSTOMER") return json({ error: "Not authorized." }, 403);

  const body = await req.json().catch(() => ({}));
  const requested: unknown[] = Array.isArray(body?.tags) ? body.tags : [];
  const tags = requested.length
    ? (requested.filter((t): t is FrontendCacheTag => FRONTEND_CACHE_TAGS.includes(t as FrontendCacheTag)))
    : FRONTEND_CACHE_TAGS;

  if (tags.length === 0) return json({ error: "No valid tags provided." }, 400);

  const ok = await revalidateFrontend(tags);
  if (!ok) {
    return json(
      { ok: false, error: "Storefront could not be reached. It will still refresh on its own within a minute." },
      502
    );
  }
  return json({ ok: true, revalidated: tags });
}