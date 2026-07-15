import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { supabaseAdmin, PRODUCT_MEDIA_BUCKET, deleteMediaByPaths } from "@/lib/storage/supabase";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. Max ${Math.round(maxBytes / (1024 * 1024))}MB.` },
      { status: 400 }
    );
  }

  const folder = isImage ? "images" : "videos";
  const ext = EXTENSION_BY_TYPE[file.type] ?? "bin";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: "Failed to upload file." }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: publicUrlData.publicUrl, path });
}

/**
 * Manual cleanup hook — used by the admin UI to delete a file it just
 * uploaded but never ended up attaching to a saved product (e.g. the admin
 * closed the "Add Product" modal without saving).
 */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path.trim() : "";

  if (!path) return NextResponse.json({ error: "Path is required." }, { status: 400 });
  if (!path.startsWith("images/") && !path.startsWith("videos/")) {
    // Guard against being pointed at an arbitrary/unexpected storage key.
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const { error } = await deleteMediaByPaths([path]);
  if (error) return NextResponse.json({ error: "Failed to delete file." }, { status: 500 });

  return NextResponse.json({ ok: true });
}