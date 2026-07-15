import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = body?.code?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({ valid: true, code: promo.code, percent: promo.percent });
}