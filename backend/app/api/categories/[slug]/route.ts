import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const body = await req.json().catch(() => null);

  try {
    const updated = await prisma.category.update({
      where: { slug },
      data: {
        name: body?.name,
        iconName: body?.iconName,
      },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({
      slug: updated.slug,
      name: updated.name,
      iconName: updated.iconName,
      productCount: updated._count.products,
    });
  } catch {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const count = await prisma.product.count({ where: { categorySlug: slug } });

  if (count > 0) {
    return NextResponse.json(
      { error: `Can't delete — ${count} product(s) still use this category.` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { slug } }).catch(() => {});
  return NextResponse.json({ ok: true });
}