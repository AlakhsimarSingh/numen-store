import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { serializeLook, validateHotspots } from "@/lib/looks/looks";

async function findLook(idOrSlug: string, includeHiddenProducts = true) {
  const hotspotInclude = {
    where: includeHiddenProducts ? undefined : { product: { category: { isVisible: true } } },
    include: { product: true },
    orderBy: { createdAt: "asc" as const },
  };
  const bySlug = await prisma.look.findUnique({
    where: { slug: idOrSlug },
    include: { hotspots: hotspotInclude },
  });
  if (bySlug) return bySlug;
  return prisma.look.findUnique({
    where: { id: idOrSlug },
    include: { hotspots: hotspotInclude },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const { idOrSlug } = await params;
  const admin = await requireAdmin();
  const look = await findLook(idOrSlug, Boolean(admin));
  if (!look || (!look.active && !admin)) {
    return NextResponse.json({ error: "Look not found." }, { status: 404 });
  }
  return NextResponse.json(serializeLook(look));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { idOrSlug } = await params;
  const existing = await findLook(idOrSlug);
  if (!existing) return NextResponse.json({ error: "Look not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
    data.title = title;
  }
  if (body.subtitle !== undefined) {
    data.subtitle = typeof body.subtitle === "string" && body.subtitle.trim() ? body.subtitle.trim() : null;
  }
  if (body.image !== undefined) {
    const image = String(body.image).trim();
    if (!image) return NextResponse.json({ error: "Image cannot be empty." }, { status: 400 });
    data.image = image;
  }
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.order !== undefined) data.order = Number(body.order) || 0;

  let hotspots: ReturnType<typeof validateHotspots>["hotspots"];
  if (body.hotspots !== undefined) {
    const result = validateHotspots(body.hotspots);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    hotspots = result.hotspots;

    const productIds = [...new Set((hotspots ?? []).map((h) => h.productId))];
    if (productIds.length > 0) {
      const found = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
      if (found.length !== productIds.length) {
        return NextResponse.json({ error: "One or more hotspot products don't exist." }, { status: 400 });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.look.update({ where: { id: existing.id }, data });
    }
    if (hotspots !== undefined) {
      await tx.lookHotspot.deleteMany({ where: { lookId: existing.id } });
      if (hotspots.length > 0) {
        await tx.lookHotspot.createMany({ data: hotspots.map((h) => ({ ...h, lookId: existing.id })) });
      }
    }
  });

  const updated = await findLook(existing.id);
  return NextResponse.json(serializeLook(updated!));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { idOrSlug } = await params;
  const existing = await findLook(idOrSlug);
  if (!existing) return NextResponse.json({ error: "Look not found." }, { status: 404 });

  await prisma.look.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}