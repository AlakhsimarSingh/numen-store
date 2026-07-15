import { prisma } from "@/lib/prisma";
import type { Review } from "@prisma/client";

export async function hasVerifiedPurchase(userId: string, productId: string): Promise<boolean> {
  const item = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: { not: "CANCELLED" } },
    },
    select: { id: true },
  });
  return !!item;
}

type ReviewWithRelations = Review & {
  user: { name: string | null };
  helpfulVotes?: { userId: string }[];
  product?: { name: string; slug: string } | null;
};

/**
 * `currentUserId` (from the request's session, if any) drives two
 * per-viewer fields: `userVoted` (did *this* viewer already mark it
 * helpful) and `isOwn` (is this the viewer's own review, replacing the
 * old fragile authorName-matching check).
 */
export function serializeReview(r: ReviewWithRelations, currentUserId?: string) {
  return {
    id: r.id,
    productId: r.productId,
    authorName: r.user.name ?? "Anonymous",
    rating: r.rating,
    title: r.title ?? undefined,
    comment: r.comment,
    verifiedPurchase: r.verifiedPurchase,
    helpfulCount: r.helpfulCount,
    createdAt: r.createdAt.toISOString(),
    userVoted: (r.helpfulVotes?.length ?? 0) > 0,
    isOwn: currentUserId ? r.userId === currentUserId : false,
    ...(r.product ? { productName: r.product.name, productSlug: r.product.slug } : {}),
  };
}