import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/products/products";
import type { Look, LookHotspot, Product } from "@prisma/client";

export function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function generateUniqueLookSlug(title: string) {
  const base = slugify(title) || "look";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.look.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

type LookWithHotspots = Look & { hotspots: (LookHotspot & { product: Product })[] };

export function serializeLook(look: LookWithHotspots) {
  return {
    id: look.id,
    slug: look.slug,
    title: look.title,
    subtitle: look.subtitle ?? undefined,
    image: look.image,
    active: look.active,
    order: look.order,
    hotspots: look.hotspots.map((h) => ({
      id: h.id,
      productId: h.productId,
      xPercent: h.xPercent,
      yPercent: h.yPercent,
      defaultColor: h.defaultColor ?? undefined,
      defaultSize: h.defaultSize ?? undefined,
      label: h.label ?? undefined,
      product: serializeProduct(h.product),
    })),
  };
}

export interface HotspotInput {
  productId: string;
  xPercent: number;
  yPercent: number;
  defaultColor?: string;
  defaultSize?: string;
  label?: string;
}

export function validateHotspots(raw: unknown): { hotspots?: HotspotInput[]; error?: string } {
  if (!Array.isArray(raw)) return { error: "hotspots must be an array." };

  const hotspots: HotspotInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return { error: "Each hotspot must be an object." };
    const { productId, xPercent, yPercent, defaultColor, defaultSize, label } = item as Record<string, unknown>;

    if (typeof productId !== "string" || !productId) {
      return { error: "Each hotspot needs a productId." };
    }
    const x = Number(xPercent);
    const y = Number(yPercent);
    if (!Number.isFinite(x) || x < 0 || x > 100 || !Number.isFinite(y) || y < 0 || y > 100) {
      return { error: "Hotspot xPercent/yPercent must be numbers between 0 and 100." };
    }

    hotspots.push({
      productId,
      xPercent: x,
      yPercent: y,
      defaultColor: typeof defaultColor === "string" && defaultColor ? defaultColor : undefined,
      defaultSize: typeof defaultSize === "string" && defaultSize ? defaultSize : undefined,
      label: typeof label === "string" && label ? label : undefined,
    });
  }
  return { hotspots };
}