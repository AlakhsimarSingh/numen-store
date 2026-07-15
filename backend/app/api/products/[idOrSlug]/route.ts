import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import {
  computeStock,
  collectProductMediaUrls,
  findProductByIdOrSlug,
  serializeProduct,
} from "@/lib/products/products";
import { deleteMediaByUrls } from "@/lib/storage/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const { idOrSlug } = await params;
  const product = await findProductByIdOrSlug(idOrSlug);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json(serializeProduct(product));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { idOrSlug } = await params;
  const existing = await findProductByIdOrSlug(idOrSlug);
  if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    data.name = name;
  }

  if (body.categorySlug !== undefined) {
    const categorySlug = String(body.categorySlug).trim();
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) return NextResponse.json({ error: "Category not found." }, { status: 400 });
    data.categorySlug = categorySlug;
  }

  if (body.price !== undefined) {
    const priceNum = Number(body.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: "Price must be a non-negative number." }, { status: 400 });
    }
    data.price = priceNum;
  }

  if (body.compareAtPrice !== undefined) {
    if (body.compareAtPrice === null || body.compareAtPrice === "") {
      data.compareAtPrice = null;
    } else {
      const n = Number(body.compareAtPrice);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "Compare-at price must be a non-negative number." }, { status: 400 });
      }
      data.compareAtPrice = n;
    }
  }

  if (body.image !== undefined) {
    const image = String(body.image).trim();
    if (!image) return NextResponse.json({ error: "Image cannot be empty." }, { status: 400 });
    data.image = image;
  }

  if (body.images !== undefined) {
    data.images = Array.isArray(body.images) ? body.images.filter((s: unknown) => typeof s === "string") : [];
  }

  if (body.video !== undefined) {
    data.video = typeof body.video === "string" && body.video.trim() ? body.video.trim() : null;
  }

  if (body.isNew !== undefined) data.isNew = Boolean(body.isNew);
  if (body.isSpotlight !== undefined) data.isSpotlight = Boolean(body.isSpotlight);

  if (body.rating !== undefined) {
    const rating = Number(body.rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 0 and 5." }, { status: 400 });
    }
    data.rating = rating;
  }

  if (body.colors !== undefined) data.colors = Array.isArray(body.colors) ? body.colors : null;
  if (body.sizes !== undefined) {
    data.sizes = Array.isArray(body.sizes) ? body.sizes.filter((s: unknown) => typeof s === "string") : [];
  }
  if (body.variantStock !== undefined) data.variantStock = Array.isArray(body.variantStock) ? body.variantStock : null;
  if (body.regionalPrices !== undefined) {
    data.regionalPrices = body.regionalPrices && typeof body.regionalPrices === "object" ? body.regionalPrices : null;
  }

  // Recompute stock authoritatively whenever anything stock-related changed.
  if (
    body.stock !== undefined ||
    body.colors !== undefined ||
    body.sizes !== undefined ||
    body.variantStock !== undefined
  ) {
    data.stock = computeStock({
      stock: body.stock !== undefined ? Number(body.stock) : existing.stock,
      colors: (data.colors ?? existing.colors) as unknown[],
      sizes: (data.sizes ?? existing.sizes) as string[],
      variantStock: (data.variantStock ?? existing.variantStock) as never,
    });
  }

  // Work out which media URLs are being dropped by this update so we can
  // reclaim the storage — Supabase free tier is limited, don't leak files.
  const mergedForDiff = {
    image: (data.image as string | undefined) ?? existing.image,
    images: (data.images as string[] | undefined) ?? existing.images,
    video: data.video !== undefined ? (data.video as string | null) : existing.video,
    colors: data.colors !== undefined ? data.colors : existing.colors,
  };
  const oldUrls = collectProductMediaUrls(existing);
  const newUrls = new Set(collectProductMediaUrls(mergedForDiff));
  const removedUrls = oldUrls.filter((u) => !newUrls.has(u));

  try {
    const updated = await prisma.product.update({ where: { id: existing.id }, data });

    if (removedUrls.length > 0) {
      // Best-effort — a storage hiccup should never fail the product update.
      deleteMediaByUrls(removedUrls).catch((err) => console.error("Storage cleanup failed:", err));
    }

    return NextResponse.json(serializeProduct(updated));
  } catch {
    return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { idOrSlug } = await params;
  const existing = await findProductByIdOrSlug(idOrSlug);
  if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const mediaUrls = collectProductMediaUrls(existing);

  await prisma.product.delete({ where: { id: existing.id } });

  if (mediaUrls.length > 0) {
    deleteMediaByUrls(mediaUrls).catch((err) => console.error("Storage cleanup failed:", err));
  }

  return NextResponse.json({ ok: true });
}