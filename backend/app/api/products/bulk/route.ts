import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { computeStock, generateSeoFields, generateUniqueSlug, serializeProduct } from "@/lib/products/products";

interface BulkRow {
  name?: string;
  categorySlug?: string;
  price?: number | string;
  compareAtPrice?: number | string;
  image?: string;
  images?: string[];
  stock?: number | string;
  sizes?: string[];
  isNew?: boolean;
  isSpotlight?: boolean;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rows: BulkRow[] = Array.isArray(body?.products) ? body.products : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No products provided." }, { status: 400 });
  }
  if (rows.length > 1000) {
    return NextResponse.json({ error: "Max 1000 products per import — split into smaller batches." }, { status: 400 });
  }

  // Fetch every referenced category once, instead of per-row, to keep a
  // 700-row import from firing 700 separate lookups. Also gives us
  // category.name for SEO description/keyword generation without an
  // extra query per row.
  const categorySlugs = [...new Set(rows.map((r) => r.categorySlug).filter(Boolean))] as string[];
  const categories = await prisma.category.findMany({ where: { slug: { in: categorySlugs } } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const created: ReturnType<typeof serializeProduct>[] = [];
  const errors: { index: number; name?: string; error: string }[] = [];

  // Sequential, not a single all-or-nothing transaction — with hundreds of
  // rows, one bad row shouldn't wipe out everything else that validated
  // fine. Each row either succeeds or reports its own error.
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const categorySlug = typeof row.categorySlug === "string" ? row.categorySlug.trim() : "";
      const image = typeof row.image === "string" ? row.image.trim() : "";
      const priceNum = Number(row.price);

      if (!name) throw new Error("Name is required.");
      const category = categoryBySlug.get(categorySlug);
      if (!category) throw new Error(`Category "${categorySlug}" not found.`);
      if (!image) throw new Error("Main image is required.");
      if (!Number.isFinite(priceNum) || priceNum < 0) throw new Error("Price must be a non-negative number.");

      let compareAtPrice: number | undefined;
      if (row.compareAtPrice !== undefined && row.compareAtPrice !== null && row.compareAtPrice !== "") {
        const n = Number(row.compareAtPrice);
        if (Number.isFinite(n) && n >= 0) compareAtPrice = n;
      }

      const images = Array.isArray(row.images) ? row.images.filter((s) => typeof s === "string") : [];
      const sizes = Array.isArray(row.sizes) ? row.sizes.filter((s) => typeof s === "string" && s.trim()) : [];
      const stock = computeStock({ stock: Number(row.stock) || 0, sizes });
      const slug = await generateUniqueSlug(name);

      const isNew = Boolean(row.isNew);
      const isSpotlight = Boolean(row.isSpotlight);
      const seo = generateSeoFields({
        name,
        categoryName: category.name,
        price: priceNum,
        isNew,
        isSpotlight,
      });

      const product = await prisma.product.create({
        data: {
          slug,
          name,
          categorySlug,
          price: priceNum,
          compareAtPrice,
          image,
          images,
          stock,
          sizes,
          isNew,
          isSpotlight,
          metaTitle: seo.metaTitle,
          metaDescription: seo.metaDescription,
          keywords: seo.keywords,
        },
      });

      created.push(serializeProduct(product));
    } catch (err) {
      errors.push({ index: i, name: row.name, error: err instanceof Error ? err.message : "Failed to create product." });
    }
  }

  return NextResponse.json({ created, errors, createdCount: created.length, errorCount: errors.length });
}