import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { serializeAdminOrder } from "@/lib/order/order";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { placedAt: "desc" },
  });

  return NextResponse.json(orders.map(serializeAdminOrder));
}