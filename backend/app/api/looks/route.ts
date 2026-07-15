import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { generateUniqueLookSlug, serializeLook, validateHotspots } from "@/lib/looks/looks";

export async function GET() {
  const admin = await requireAdmin();
  const looks = await prisma.look.findMany({
    where: admin ? {} : { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { hotspots: { include: { product: true }, orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(looks.map(serializeLook));
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const image = typeof body.image === "string" ? body.image.trim() : "";
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!image) return NextResponse.json({ error: "Image is required." }, { status: 400 });

  const { hotspots, error } = validateHotspots(body.hotspots ?? []);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const productIds = [...new Set((hotspots ?? []).map((h) => h.productId))];
  if (productIds.length > 0) {
    const found = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
    if (found.length !== productIds.length) {
      return NextResponse.json({ error: "One or more hotspot products don't exist." }, { status: 400 });
    }
  }

  const slug = await generateUniqueLookSlug(title);
  const subtitle = typeof body.subtitle === "string" && body.subtitle.trim() ? body.subtitle.trim() : undefined;
  const active = body.active !== undefined ? Boolean(body.active) : true;
  const order = Number.isFinite(Number(body.order)) ? Number(body.order) : 0;

  const created = await prisma.look.create({
    data: {
      slug,
      title,
      subtitle,
      image,
      active,
      order,
      hotspots: { create: hotspots ?? [] },
    },
    include: { hotspots: { include: { product: true } } },
  });

  return NextResponse.json(serializeLook(created), { status: 201 });
}