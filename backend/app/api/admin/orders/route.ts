import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { serializeAdminOrder } from "@/lib/order/order";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const promoCode = req.nextUrl.searchParams.get("promoCode")?.trim().toUpperCase();

  const orders = await prisma.order.findMany({
    where: promoCode ? { promoCode } : undefined,
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { placedAt: "desc" },
  });

  return NextResponse.json(orders.map(serializeAdminOrder));
}