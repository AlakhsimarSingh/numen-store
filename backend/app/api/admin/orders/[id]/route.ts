import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { serializeOrder, STATUS_MAP } from "@/lib/order/order";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const data: Prisma.OrderUpdateInput = {};

  if (body.status) {
    const mapped = STATUS_MAP[body.status as keyof typeof STATUS_MAP];
    if (!mapped) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    data.status = mapped;
  }

  if (body.returnDecision) {
    if (!order.returnStatus) {
      return NextResponse.json({ error: "No return request on this order." }, { status: 400 });
    }
    if (body.returnDecision === "approved") data.returnStatus = "APPROVED";
    else if (body.returnDecision === "rejected") data.returnStatus = "REJECTED";
    else return NextResponse.json({ error: "Invalid return decision." }, { status: 400 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data,
    include: { items: true },
  });

  return NextResponse.json(serializeOrder(updated));
}