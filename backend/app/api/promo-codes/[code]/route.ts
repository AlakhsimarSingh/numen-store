import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

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