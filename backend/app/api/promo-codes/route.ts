import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [promoCodes, usageStats] = await Promise.all([
    prisma.promoCode.findMany({ orderBy: { code: "asc" } }),
    // Only counts/sums orders where payment actually succeeded — a code
    // entered on an abandoned or failed checkout was never really "used".
    // subtotalBaseINR (not the raw, per-currency subtotal) is summed so
    // orders placed in different currencies don't get added together as
    // if they were the same unit.
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

  if (!code || !Number.isFinite(rawPercent) || rawPercent < 0.01 || rawPercent > 100) {
    return NextResponse.json({ error: "Invalid code or percent (0.01–100)." }, { status: 400 });
  }
  const percent = Math.round(rawPercent * 100) / 100;

  try {
    const promo = await prisma.promoCode.create({
      data: { code, percent, active: body?.active ?? true },
    });
    return NextResponse.json({ ...promo, usageCount: 0, totalSubtotalINR: 0 }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "That code already exists." }, { status: 409 });
  }
}