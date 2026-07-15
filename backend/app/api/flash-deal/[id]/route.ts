import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { serializeFlashDeal } from "@/lib/flashDeal";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.productId !== undefined) {
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 400 });
    data.productId = body.productId;
  }
  if (body.label !== undefined) data.label = String(body.label).trim() || "Flash Deal";
  if (body.startsAt !== undefined) data.startsAt = new Date(body.startsAt);
  if (body.endsAt !== undefined) data.endsAt = new Date(body.endsAt);
  if (body.active !== undefined) data.active = Boolean(body.active);

  try {
    const updated = await prisma.flashDeal.update({ where: { id }, data, include: { product: true } });
    return NextResponse.json(serializeFlashDeal(updated));
  } catch {
    return NextResponse.json({ error: "Flash deal not found." }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.flashDeal.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}