import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { serializeOrder } from "@/lib/order/order";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });

  if (!order || (order.userId !== user.id && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json(serializeOrder(order));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.reason) {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }
  if (order.status !== "DELIVERED") {
    return NextResponse.json({ error: "Only delivered orders can be returned." }, { status: 400 });
  }
  if (order.returnStatus) {
    return NextResponse.json({ error: "A return has already been requested for this order." }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      returnStatus: "REQUESTED",
      returnReason: body.reason,
      returnComment: body.comment ?? "",
      returnRequestedAt: new Date(),
    },
    include: { items: true },
  });

  return NextResponse.json(serializeOrder(updated));
}