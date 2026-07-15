import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { getCurrentFlashDeal, serializeFlashDeal } from "@/lib/flashDeal";

export async function GET() {
  const deal = await getCurrentFlashDeal();
  return NextResponse.json(deal);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const productId = typeof body.productId === "string" ? body.productId : "";
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Flash Deal";
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);

  if (!productId) return NextResponse.json({ error: "Product is required." }, { status: 400 });
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Valid start and end times are required." }, { status: 400 });
  }
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 400 });

  const created = await prisma.flashDeal.create({
    data: { productId, label, startsAt, endsAt, active: true },
    include: { product: true },
  });

  return NextResponse.json(serializeFlashDeal(created), { status: 201 });
}