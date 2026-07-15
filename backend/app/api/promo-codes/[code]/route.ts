import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const body = await req.json().catch(() => null);

  try {
    const promo = await prisma.promoCode.update({
      where: { code: code.toUpperCase() },
      data: {
        percent: body?.percent !== undefined ? Number(body.percent) : undefined,
        active: body?.active !== undefined ? Boolean(body.active) : undefined,
      },
    });
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