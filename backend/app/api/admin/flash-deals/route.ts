import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { serializeFlashDeal } from "@/lib/flashDeal";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deals = await prisma.flashDeal.findMany({
    include: { product: true },
    orderBy: { startsAt: "desc" },
  });

  return NextResponse.json(deals.map(serializeFlashDeal));
}