import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method || method.userId !== user.id) {
    return NextResponse.json({ error: "Payment method not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (body?.setDefault) {
    await prisma.paymentMethod.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    const updated = await prisma.paymentMethod.update({ where: { id }, data: { isDefault: true } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "No valid update provided." }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method || method.userId !== user.id) {
    return NextResponse.json({ error: "Payment method not found." }, { status: 404 });
  }

  await prisma.paymentMethod.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}