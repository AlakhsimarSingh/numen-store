import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  if (code === "INR") {
    return NextResponse.json({ error: "INR is the base currency and can't be edited." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const data: { rate?: number; symbol?: string } = {};

  if (body.rate !== undefined) {
    const rate = Number(body.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: "Rate must be a positive number." }, { status: 400 });
    }
    data.rate = rate;
  }

  if (body.symbol !== undefined) {
    const symbol = String(body.symbol).trim();
    if (!symbol || symbol.length > 6) {
      return NextResponse.json({ error: "Symbol must be 1-6 characters." }, { status: 400 });
    }
    data.symbol = symbol;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const updated = await prisma.currencyRate.update({ where: { code }, data });
    return NextResponse.json({ code: updated.code, rate: updated.rate, symbol: updated.symbol });
  } catch {
    return NextResponse.json({ error: "Currency not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  if (code === "INR") {
    return NextResponse.json({ error: "INR is the base currency and can't be deleted." }, { status: 400 });
  }

  await prisma.currencyRate.delete({ where: { code } }).catch(() => {});
  return NextResponse.json({ ok: true });
}