import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public, unauthenticated — powers the "connect with a seller" picker
// shown to customers who don't have a code of their own. Only surfaces
// codes a business has explicitly opted into public discovery
// (publiclyListed) — codes handed out directly and privately by a
// business never appear here, even if active.
export async function GET() {
  const partners = await prisma.promoCode.findMany({
    where: { active: true, publiclyListed: true },
    select: { code: true, businessName: true, description: true, percent: true },
    orderBy: { businessName: "asc" },
  });
  return NextResponse.json(partners);
}