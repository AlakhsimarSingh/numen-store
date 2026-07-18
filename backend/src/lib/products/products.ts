import { prisma } from "@/lib/prisma";
import type { Product } from "@prisma/client";

export function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Generates a slug guaranteed unique among *other* products.
 *
 * `excludeId` matters for updates: when re-slugging an existing product
 * (e.g. after a name change), the product's own current row would
 * otherwise be found as a "collision" against itself, causing a needless
 * "-2" suffix to be appended every single time it's edited, even when the
 * new name doesn't actually clash with anything else.
 */
export async function generateUniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "product";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (
    await prisma.product.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
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
    // SEO — always server-generated, never admin-editable. Exposed here so
    // the frontend product page can drop them straight into <head> /
    // structured data without recomputing anything.
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    keywords: p.keywords,
    imageAlt: p.name,
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

// ---------------------------------------------------------------------------
// SEO generation
// ---------------------------------------------------------------------------
// Fully automatic — the admin never sees or fills these fields in. Derived
// purely from product data (name, category, price, badges) at create time
// and regenerated at update time whenever any input to them changes.

const SITE_NAME = "NUMEN";
const MAX_META_TITLE = 60;
const MAX_META_DESCRIPTION = 160;
const MAX_KEYWORDS = 15;

// Common filler words excluded from auto-generated keywords so the list
// stays useful (product-specific terms) rather than padded with noise.
const STOPWORDS = new Set([
  "the", "and", "with", "for", "from", "this", "that", "your", "our",
]);

function truncateAtWordBoundary(str: string, max: number) {
  if (str.length <= max) return str;
  const cut = str.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export interface SeoFields {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
}

export interface SeoInput {
  name: string;
  categoryName?: string | null;
  price: number;
  isNew?: boolean;
  isSpotlight?: boolean;
}

/**
 * Builds meta title, meta description, and a keyword list from product
 * data. Called from the create and update routes — never accepts client
 * input for any of these fields.
 */
export function generateSeoFields(input: SeoInput): SeoFields {
  const category = input.categoryName?.trim() || undefined;

  const titleParts = [input.name, category, SITE_NAME].filter(Boolean) as string[];
  const metaTitle = truncateAtWordBoundary(titleParts.join(" | "), MAX_META_TITLE);

  const priceText = Number.isFinite(input.price)
    ? `₹${Math.round(input.price).toLocaleString("en-IN")}`
    : undefined;

  const descBits = [
    `Shop ${input.name}`,
    category ? `from our ${category} collection` : null,
    priceText ? `at ${priceText}.` : ".",
    input.isNew ? "New arrival." : null,
    input.isSpotlight ? "Featured pick." : null,
    `Premium streetwear from ${SITE_NAME} — fast shipping, easy returns.`,
  ].filter(Boolean);
  const metaDescription = truncateAtWordBoundary(descBits.join(" ").replace(/\s+/g, " "), MAX_META_DESCRIPTION);

  const keywordSet = new Set<string>();
  const addWords = (text: string) => {
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      .forEach((w) => keywordSet.add(w));
  };
  addWords(input.name);
  keywordSet.add(input.name.toLowerCase().trim());
  if (category) {
    addWords(category);
    keywordSet.add(category.toLowerCase());
  }
  keywordSet.add(SITE_NAME.toLowerCase());
  keywordSet.add("streetwear");
  if (input.isNew) keywordSet.add("new arrival");
  if (input.isSpotlight) keywordSet.add("featured");

  return {
    metaTitle,
    metaDescription,
    keywords: Array.from(keywordSet).slice(0, MAX_KEYWORDS),
  };
}