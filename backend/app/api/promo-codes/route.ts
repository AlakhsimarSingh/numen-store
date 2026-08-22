import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [promoCodes, usageCounts] = await Promise.all([
    prisma.promoCode.findMany({ orderBy: { code: "asc" } }),
    // Only counts orders where payment actually succeeded — a code entered
    // on an abandoned or failed checkout was never really "used".
    prisma.order.groupBy({
      by: ["promoCode"],
      where: { promoCode: { not: null }, paymentStatus: "PAID" },
      _count: { _all: true },
    }),
  ]);

  const countByCode = new Map(usageCounts.map((u) => [u.promoCode, u._count._all]));

  const withCounts = promoCodes.map((p) => ({
    ...p,
    usageCount: countByCode.get(p.code) ?? 0,
  }));

  return NextResponse.json(withCounts);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const code = body?.code?.trim().toUpperCase();
  const percent = Number(body?.percent);

  if (!code || !Number.isInteger(percent) || percent < 1 || percent > 100) {
    return NextResponse.json({ error: "Invalid code or percent (1-100)." }, { status: 400 });
  }

  try {
    const promo = await prisma.promoCode.create({
      data: { code, percent, active: body?.active ?? true },
    });
    return NextResponse.json({ ...promo, usageCount: 0 }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "That code already exists." }, { status: 409 });
  }
}