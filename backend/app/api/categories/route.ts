import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

interface PreviewSource {
  categorySlug: string;
  image: string;
}

function serialize(
  c: { slug: string; name: string; iconName: string; _count: { products: number } },
  previewImage?: string
) {
  return {
    slug: c.slug,
    name: c.name,
    iconName: c.iconName,
    productCount: c._count.products,
    ...(previewImage ? { previewImage } : {}),
  };
}

export async function GET() {
  const [categories, spotlightProducts, recentProducts] = await Promise.all([
    prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
    // One product per category, preferring the one the admin has flagged
    // as isSpotlight (their intentional "best foot forward" pick).
    // `distinct` + `orderBy: createdAt desc` keeps the most recent
    // spotlighted product per category if there happens to be more than
    // one.
    prisma.product.findMany({
      where: { isSpotlight: true },
      orderBy: { createdAt: "desc" },
      distinct: ["categorySlug"],
      select: { categorySlug: true, image: true },
    }),
    // Fallback for categories with no spotlighted product — most recently
    // added product in that category, so every category with at least one
    // product gets a preview image even if the admin never curated one.
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      distinct: ["categorySlug"],
      select: { categorySlug: true, image: true },
    }),
  ]);

  const spotlightBySlug = new Map((spotlightProducts as PreviewSource[]).map((p) => [p.categorySlug, p.image]));
  const recentBySlug = new Map((recentProducts as PreviewSource[]).map((p) => [p.categorySlug, p.image]));

  return NextResponse.json(
    categories.map((c) => serialize(c, spotlightBySlug.get(c.slug) ?? recentBySlug.get(c.slug)))
  );
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  const iconName = body?.iconName?.trim();

  if (!name || !iconName) {
    return NextResponse.json({ error: "Name and icon are required." }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  try {
    const category = await prisma.category.create({ data: { slug, name, iconName } });
    return NextResponse.json(serialize({ ...category, _count: { products: 0 } }), { status: 201 });
  } catch {
    return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
  }
}