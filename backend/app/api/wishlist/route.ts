import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

function serializeProduct(p: {
  id: string; slug: string; name: string; categorySlug: string;
  price: unknown; compareAtPrice: unknown; image: string; images: string[];
  stock: number; isNew: boolean; rating: number;
}) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
    image: p.image,
    images: p.images,
    stock: p.stock,
    isNew: p.isNew,
    rating: p.rating,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    productIds: items.map((i) => i.productId),
    products: items.map((i) => serializeProduct(i.product)),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.productId) return NextResponse.json({ error: "productId is required." }, { status: 400 });

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId: body.productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ wishlisted: false });
  }

  await prisma.wishlistItem.create({ data: { userId: user.id, productId: body.productId } });
  return NextResponse.json({ wishlisted: true });
}