import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = await params;
  const chart = await prisma.sizeChart.findUnique({ where: { categorySlug } });
  if (!chart) return NextResponse.json({ error: "No size chart for this category." }, { status: 404 });

  return NextResponse.json({
    categorySlug: chart.categorySlug,
    columns: chart.columns,
    rows: chart.rows,
    updatedAt: chart.updatedAt.toISOString(),
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ categorySlug: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categorySlug } = await params;
  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const columns = Array.isArray(body.columns) ? body.columns : null;
  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!columns || !rows) {
    return NextResponse.json({ error: "columns and rows are required arrays." }, { status: 400 });
  }
  for (const col of columns) {
    if (typeof col?.key !== "string" || typeof col?.label !== "string") {
      return NextResponse.json({ error: "Each column needs a key and a label." }, { status: 400 });
    }
  }
  for (const row of rows) {
    if (typeof row?.size !== "string" || typeof row?.values !== "object" || row.values === null) {
      return NextResponse.json({ error: "Each row needs a size and a values object." }, { status: 400 });
    }
  }

  const saved = await prisma.sizeChart.upsert({
    where: { categorySlug },
    create: { categorySlug, columns, rows },
    update: { columns, rows },
  });

  return NextResponse.json({
    categorySlug: saved.categorySlug,
    columns: saved.columns,
    rows: saved.rows,
    updatedAt: saved.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ categorySlug: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categorySlug } = await params;
  await prisma.sizeChart.deleteMany({ where: { categorySlug } });
  return NextResponse.json({ ok: true });
}