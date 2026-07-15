import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Cascades to ReviewHelpfulVote automatically (onDelete: Cascade in schema).
  await prisma.review.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}