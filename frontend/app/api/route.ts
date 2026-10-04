import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { CACHE_TAG_LIST } from "@/src/data/cacheTags";

const ALLOWED = new Set<string>(CACHE_TAG_LIST);

/**
 * Receiver for cache purges. It has to live in the FRONTEND because the tagged
 * fetch cache belongs to the frontend server; revalidateTag only clears the
 * cache of the process it runs in.
 *
 * Not called by the browser. The backend calls it through
 * backend/app/api/revalidate/route.ts or lib/revalidateFrontend.ts:
 *
 *   POST {FRONTEND_URL}/api/revalidate
 *   header  x-revalidate-secret: <REVALIDATE_SECRET>
 *   body    { "tags": ["products", "categories"] }
 *
 * This is the one route in the frontend's app/api. Local route files take
 * priority over next.config rewrites by default; if your rewrite for /api/*
 * is declared as `beforeFiles`, exclude /api/revalidate from it.
 *
 * NOTE: on Next 16+, revalidateTag takes a second argument: revalidateTag(tag, "max").
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { tags?: string[] };
  const tags = (body.tags ?? []).filter((t) => ALLOWED.has(t));
  for (const tag of tags) revalidateTag(tag, "max");

  return NextResponse.json({ ok: true, revalidated: tags });
}