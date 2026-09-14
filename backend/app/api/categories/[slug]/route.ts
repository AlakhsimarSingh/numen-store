import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { collectProductMediaUrls } from "@/lib/products/products";
import { deleteMediaByUrls } from "@/lib/storage/supabase";

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
        isVisible: typeof body?.isVisible === "boolean" ? body.isVisible : undefined,
      },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({
      slug: updated.slug,
      name: updated.name,
      iconName: updated.iconName,
      isVisible: updated.isVisible,
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
  const products = await prisma.product.findMany({
    where: { categorySlug: slug },
    select: { id: true, image: true, images: true, video: true, colors: true },
  });
  const mediaUrls = products.flatMap((product) => collectProductMediaUrls(product));
  const productIds = products.map((product) => product.id);

  try {
    await prisma.$transaction(async (tx) => {
      if (productIds.length > 0) {
        // Preserve historical order snapshots while releasing the FK so the
        // products themselves can be removed completely.
        await tx.orderItem.updateMany({ where: { productId: { in: productIds } }, data: { productId: null } });
        await tx.product.deleteMany({ where: { id: { in: productIds } } });
      }
      await tx.sizeChart.deleteMany({ where: { categorySlug: slug } });
      await tx.category.delete({ where: { slug } });
    });
  } catch {
    return NextResponse.json({ error: "Failed to delete category and its products." }, { status: 500 });
  }

  await deleteMediaByUrls(mediaUrls);
  return NextResponse.json({ ok: true, deletedProducts: productIds.length });
}