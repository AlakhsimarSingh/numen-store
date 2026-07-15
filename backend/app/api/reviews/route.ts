import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";
import { hasVerifiedPurchase, serializeReview } from "@/lib/reviews/reviews";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  if (productId) {
    // Public: reviews for a single product. Logged-in viewers get their
    // own helpful-vote state and "is this my review" flag attached.
    const user = await getCurrentUser();
    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: { select: { name: true } },
        helpfulVotes: user ? { where: { userId: user.id } } : false,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reviews.map((r) => serializeReview(r, user?.id)));
  }

  // No productId -> admin moderation view across every product.
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = searchParams.get("q")?.trim();
  const reviews = await prisma.review.findMany({
    where: q
      ? {
          OR: [
            { comment: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: {
      user: { select: { name: true } },
      product: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(reviews.map((r) => serializeReview(r)));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to write a review." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const productId = typeof body.productId === "string" ? body.productId : "";
  const rating = Number(body.rating);
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (!productId) return NextResponse.json({ error: "Product is required." }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }
  if (comment.length < 10) {
    return NextResponse.json({ error: "Review must be at least 10 characters." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId, userId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "You've already reviewed this product." }, { status: 409 });
  }

  // Computed server-side, never trusted from the client.
  const verifiedPurchase = await hasVerifiedPurchase(user.id, productId);

  const created = await prisma.review.create({
    data: {
      productId,
      userId: user.id,
      rating,
      title: title || null,
      comment,
      verifiedPurchase,
    },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(serializeReview({ ...created, helpfulVotes: [] }, user.id), { status: 201 });
}