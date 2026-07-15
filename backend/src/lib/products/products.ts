import { prisma } from "@/lib/prisma";
import type { Product } from "@prisma/client";

export function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function generateUniqueSlug(name: string) {
  const base = slugify(name) || "product";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.product.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export function serializeProduct(p: Product) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : undefined,
    image: p.image,
    images: p.images,
    video: p.video ?? undefined,
    stock: p.stock,
    isNew: p.isNew,
    isSpotlight: p.isSpotlight,
    rating: p.rating,
    colors: (p.colors as unknown) ?? undefined,
    sizes: p.sizes,
    variantStock: (p.variantStock as unknown) ?? undefined,
    regionalPrices: (p.regionalPrices as unknown) ?? undefined,
  };
}

/** Tries slug first, then falls back to id — either match is accepted. */
export async function findProductByIdOrSlug(idOrSlug: string) {
  const bySlug = await prisma.product.findUnique({ where: { slug: idOrSlug } });
  if (bySlug) return bySlug;
  return prisma.product.findUnique({ where: { id: idOrSlug } });
}

interface VariantStockInput {
  color: string;
  size: string;
  stock: number;
}

export function computeStock(input: {
  stock?: number;
  colors?: unknown[];
  sizes?: string[];
  variantStock?: VariantStockInput[];
}) {
  const hasVariants = (input.colors?.length ?? 0) > 0 || (input.sizes?.length ?? 0) > 0;
  if (hasVariants) {
    return (input.variantStock ?? []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  }
  return Number(input.stock) || 0;
}

interface ColorOptionLike {
  images?: string[];
  video?: string | null;
}

/**
 * Every media URL (main image, gallery images, top-level video, per-color
 * images/videos) referenced by a product record. Used to diff old vs. new
 * state on update/delete so we know exactly what to remove from storage.
 */
export function collectProductMediaUrls(p: {
  image?: string | null;
  images?: string[] | null;
  video?: string | null;
  colors?: unknown;
}): string[] {
  const urls: string[] = [];
  if (p.image) urls.push(p.image);
  if (p.images) urls.push(...p.images);
  if (p.video) urls.push(p.video);
  if (Array.isArray(p.colors)) {
    for (const c of p.colors as ColorOptionLike[]) {
      if (Array.isArray(c?.images)) urls.push(...c.images);
      if (c?.video) urls.push(c.video);
    }
  }
  return urls;
}