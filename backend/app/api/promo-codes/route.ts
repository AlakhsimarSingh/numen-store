import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [promoCodes, usageStats] = await Promise.all([
    prisma.promoCode.findMany({ orderBy: { code: "asc" } }),
    prisma.order.groupBy({
      by: ["promoCode"],
      where: { promoCode: { not: null }, paymentStatus: "PAID" },
      _count: { _all: true },
      _sum: { subtotalBaseINR: true },
    }),
  ]);

  const statsByCode = new Map(
    usageStats.map((u) => [u.promoCode, { count: u._count._all, subtotalINR: Number(u._sum.subtotalBaseINR ?? 0) }])
  );

  const withStats = promoCodes.map((p) => {
    const stats = statsByCode.get(p.code);
    return {
      ...p,
      usageCount: stats?.count ?? 0,
      totalSubtotalINR: stats?.subtotalINR ?? 0,
    };
  });

  return NextResponse.json(withStats);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const code = body?.code?.trim().toUpperCase();
  const rawPercent = Number(body?.percent);
  const businessName = body?.businessName?.trim();

  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }
  if (!businessName) {
    return NextResponse.json(
      { error: "Business name is required — every code needs to be attributable to a partner." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(rawPercent) || rawPercent < 0 || rawPercent > 100) {
    return NextResponse.json({ error: "Percent must be between 0 and 100." }, { status: 400 });
  }
  const percent = Math.round(rawPercent * 100) / 100;

  try {
    const promo = await prisma.promoCode.create({
      data: {
        code,
        percent,
        active: body?.active ?? true,
        businessName,
        contactName: body?.contactName?.trim() || null,
        contactEmail: body?.contactEmail?.trim() || null,
        contactPhone: body?.contactPhone?.trim() || null,
        description: body?.description?.trim() || null,
        publiclyListed: Boolean(body?.publiclyListed),
      },
    });
    return NextResponse.json({ ...promo, usageCount: 0, totalSubtotalINR: 0 }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "That code already exists." }, { status: 409 });
  }
}