import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const normalizedCode = code.toUpperCase();
  const promo = await prisma.promoCode.findUnique({ where: { code: normalizedCode } });
  if (!promo) return NextResponse.json({ error: "Representative signature not found." }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { promoCode: normalizedCode },
    select: {
      id: true,
      placedAt: true,
      status: true,
      paymentStatus: true,
      currency: true,
      subtotal: true,
      subtotalBaseINR: true,
      items: { select: { productId: true, name: true, image: true, price: true, qty: true } },
    },
    orderBy: { placedAt: "desc" },
  });

  const productStats = new Map<string, { productId: string | null; name: string; image: string; units: number; revenueINR: number }>();
  const statusCounts: Record<string, number> = {};
  let paidOrderCount = 0;
  let paidRevenueINR = 0;
  let paidUnits = 0;

  for (const order of orders) {
    statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
    if (order.paymentStatus !== "PAID") continue;

    paidOrderCount++;
    paidRevenueINR += Number(order.subtotalBaseINR);
    const orderGross = order.items.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
    for (const item of order.items) {
      const units = item.qty;
      paidUnits += units;
      const itemGross = Number(item.price) * units;
      const revenueINR = orderGross > 0 ? (itemGross / orderGross) * Number(order.subtotalBaseINR) : 0;
      const key = item.productId ?? `snapshot:${item.name}`;
      const current = productStats.get(key);
      if (current) {
        current.units += units;
        current.revenueINR += revenueINR;
      } else {
        productStats.set(key, { productId: item.productId, name: item.name, image: item.image, units, revenueINR });
      }
    }
  }

  return NextResponse.json({
    code: promo.code,
    businessName: promo.businessName,
    percent: promo.percent,
    orderCount: orders.length,
    paidOrderCount,
    paidUnits,
    paidRevenueINR,
    statusCounts,
    topProducts: [...productStats.values()]
      .sort((a, b) => b.units - a.units || b.revenueINR - a.revenueINR),
    recentOrders: orders.map((order) => ({
      id: order.id,
      placedAt: order.placedAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      subtotal: Number(order.subtotal),
      subtotalBaseINR: Number(order.subtotalBaseINR),
      itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const data: Prisma.PromoCodeUpdateInput = {};

  if (body.percent !== undefined) {
    const percent = Number(body.percent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return NextResponse.json({ error: "Percent must be between 0 and 100." }, { status: 400 });
    }
    data.percent = Math.round(percent * 100) / 100;
  }
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.businessName !== undefined) {
    const name = String(body.businessName).trim();
    if (!name) return NextResponse.json({ error: "Business name can't be empty." }, { status: 400 });
    data.businessName = name;
  }
  if (body.contactName !== undefined) data.contactName = body.contactName ? String(body.contactName).trim() : null;
  if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail ? String(body.contactEmail).trim() : null;
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone ? String(body.contactPhone).trim() : null;
  if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;
  if (body.publiclyListed !== undefined) data.publiclyListed = Boolean(body.publiclyListed);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const promo = await prisma.promoCode.update({ where: { code: code.toUpperCase() }, data });
    return NextResponse.json(promo);
  } catch {
    return NextResponse.json({ error: "Promo code not found." }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  await prisma.promoCode.delete({ where: { code: code.toUpperCase() } }).catch(() => {});
  return NextResponse.json({ ok: true });
}