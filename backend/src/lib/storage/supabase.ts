import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export const PRODUCT_MEDIA_BUCKET = "product-media";

/**
 * Turns a Supabase public URL back into the storage path used by the SDK's
 * remove() call, e.g.
 * "https://xyz.supabase.co/storage/v1/object/public/product-media/images/foo.jpg"
 * -> "images/foo.jpg"
 * Returns null for anything that isn't one of our own public URLs (external
 * URLs an admin typed in manually should never be sent to remove()).
 */
export function extractStoragePath(url: string): string | null {
  const marker = `/object/public/${PRODUCT_MEDIA_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length);
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Best-effort bulk delete by public URL. Silently skips URLs that aren't
 * ours (external images) and logs (but does not throw) storage errors, so a
 * failed cleanup never blocks the DB operation that triggered it.
 */
export async function deleteMediaByUrls(urls: (string | null | undefined)[]): Promise<void> {
  const paths = Array.from(
    new Set(
      urls
        .filter((u): u is string => typeof u === "string" && u.length > 0)
        .map((u) => extractStoragePath(u))
        .filter((p): p is string => !!p)
    )
  );
  if (paths.length === 0) return;

  const { error } = await supabaseAdmin.storage.from(PRODUCT_MEDIA_BUCKET).remove(paths);
  if (error) {
    console.error("Failed to delete media from storage:", error, paths);
  }
}

/** Delete by raw storage path — used by the manual /api/upload DELETE endpoint. */
export async function deleteMediaByPaths(paths: string[]): Promise<{ error: string | null }> {
  if (paths.length === 0) return { error: null };
  const { error } = await supabaseAdmin.storage.from(PRODUCT_MEDIA_BUCKET).remove(paths);
  return { error: error ? error.message : null };
}