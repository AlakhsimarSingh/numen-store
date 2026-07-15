import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeReview } from "@/lib/reviews/reviews";

export async function GET() {
  // Pull a wider candidate pool before filtering by comment length, so a
  // handful of short top-rated reviews don't crowd out the more
  // substantial ones we actually want to feature.
  const candidates = await prisma.review.findMany({
    include: {
      user: { select: { name: true } },
      product: { select: { name: true, slug: true } },
    },
    orderBy: [{ rating: "desc" }, { helpfulCount: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  const featured = candidates.filter((r) => r.comment.length > 20).slice(0, 3);

  return NextResponse.json(featured.map((r) => serializeReview(r)));
}