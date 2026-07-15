import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

function serialize(c: { slug: string; name: string; iconName: string; _count: { products: number } }) {
  return { slug: c.slug, name: c.name, iconName: c.iconName, productCount: c._count.products };
}

export async function GET() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories.map(serialize));
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  const iconName = body?.iconName?.trim();

  if (!name || !iconName) {
    return NextResponse.json({ error: "Name and icon are required." }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  try {
    const category = await prisma.category.create({ data: { slug, name, iconName } });
    return NextResponse.json(serialize({ ...category, _count: { products: 0 } }), { status: 201 });
  } catch {
    return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
  }
}