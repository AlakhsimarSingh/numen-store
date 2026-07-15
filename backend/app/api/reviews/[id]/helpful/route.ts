import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * One-way toggle — matches the original UX where a helpful vote, once
 * cast, can't be un-cast. The @@unique([reviewId, userId]) constraint on
 * ReviewHelpfulVote is what actually enforces "once per user" here; a
 * second attempt fails the insert and we report it as already-voted.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to vote." }, { status: 401 });

  const { id } = await params;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.reviewHelpfulVote.create({ data: { reviewId: id, userId: user.id } });
      return tx.review.update({ where: { id }, data: { helpfulCount: { increment: 1 } } });
    });
    return NextResponse.json({ id: updated.id, helpfulCount: updated.helpfulCount, userVoted: true });
  } catch {
    return NextResponse.json({ error: "You've already marked this review as helpful." }, { status: 409 });
  }
}