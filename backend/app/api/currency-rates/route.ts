import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

const CODE_REGEX = /^[A-Z]{3}$/;

export async function GET() {
  const rates = await prisma.currencyRate.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json(rates.map((r) => ({ code: r.code, rate: r.rate, symbol: r.symbol })));
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const rate = Number(body.rate);
  const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";

  if (!CODE_REGEX.test(code)) {
    return NextResponse.json({ error: "Currency code must be a 3-letter ISO 4217 code (e.g. USD)." }, { status: 400 });
  }
  if (code === "INR") {
    return NextResponse.json({ error: "INR is the base currency and can't be added as a rate." }, { status: 400 });
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ error: "Rate must be a positive number (e.g. 1 USD = 83.5 INR → enter 83.5)." }, { status: 400 });
  }
  if (!symbol || symbol.length > 6) {
    return NextResponse.json({ error: "Enter a currency symbol/annotation (e.g. $, €, AED)." }, { status: 400 });
  }

  try {
    const created = await prisma.currencyRate.create({ data: { code, rate, symbol } });
    return NextResponse.json({ code: created.code, rate: created.rate, symbol: created.symbol }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "That currency already exists." }, { status: 409 });
  }
}