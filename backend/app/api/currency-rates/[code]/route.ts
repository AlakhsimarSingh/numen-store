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
  const rate = Number(body?.rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ error: "Rate must be a positive number." }, { status: 400 });
  }

  try {
    const updated = await prisma.currencyRate.update({ where: { code }, data: { rate } });
    return NextResponse.json({ code: updated.code, rate: updated.rate });
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