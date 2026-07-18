import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { computeStock, generateSeoFields, generateUniqueSlug, serializeProduct } from "@/lib/products/products";

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(products.map(serializeProduct));
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const categorySlug = typeof body.categorySlug === "string" ? body.categorySlug.trim() : "";
  const image = typeof body.image === "string" ? body.image.trim() : "";
  const priceNum = Number(body.price);

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!categorySlug) return NextResponse.json({ error: "Category is required." }, { status: 400 });
  if (!image) return NextResponse.json({ error: "Image is required." }, { status: 400 });
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return NextResponse.json({ error: "Price must be a non-negative number." }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 400 });

  let compareAtPrice: number | undefined;
  if (body.compareAtPrice !== undefined && body.compareAtPrice !== null && body.compareAtPrice !== "") {
    const n = Number(body.compareAtPrice);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "Compare-at price must be a non-negative number." }, { status: 400 });
    }
    compareAtPrice = n;
  }

  let rating = 4.5;
  if (body.rating !== undefined && body.rating !== null && body.rating !== "") {
    rating = Number(body.rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 0 and 5." }, { status: 400 });
    }
  }

  const colors = Array.isArray(body.colors) ? body.colors : undefined;
  const sizes = Array.isArray(body.sizes) ? body.sizes.filter((s: unknown) => typeof s === "string") : [];
  const variantStock = Array.isArray(body.variantStock) ? body.variantStock : undefined;
  const regionalPrices =
    body.regionalPrices && typeof body.regionalPrices === "object" ? body.regionalPrices : undefined;
  const images = Array.isArray(body.images) ? body.images.filter((s: unknown) => typeof s === "string") : [];
  const video = typeof body.video === "string" && body.video.trim() ? body.video.trim() : undefined;
  const isNew = Boolean(body.isNew);
  const isSpotlight = Boolean(body.isSpotlight);

  const stock = computeStock({ stock: Number(body.stock) || 0, colors, sizes, variantStock });
  const slug = await generateUniqueSlug(name);

  // SEO fields are always derived server-side from the product's real data
  // — the request body is never consulted for metaTitle/metaDescription/
  // keywords, even if a client happened to send them.
  const seo = generateSeoFields({
    name,
    categoryName: category.name,
    price: priceNum,
    isNew,
    isSpotlight,
  });

  try {
    const created = await prisma.product.create({
      data: {
        slug,
        name,
        categorySlug,
        price: priceNum,
        compareAtPrice,
        image,
        images,
        video,
        stock,
        isNew,
        isSpotlight,
        rating,
        colors,
        sizes,
        variantStock,
        regionalPrices,
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
        keywords: seo.keywords,
      },
    });
    return NextResponse.json(serializeProduct(created), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}