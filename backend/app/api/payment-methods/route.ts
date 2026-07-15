import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const methods = await prisma.paymentMethod.findMany({
    where: { userId: user.id },
    orderBy: { isDefault: "desc" },
  });

  return NextResponse.json(methods);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.type || !body?.label || !["card", "upi"].includes(body.type)) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }

  const existingCount = await prisma.paymentMethod.count({ where: { userId: user.id } });
  const makeDefault = existingCount === 0;

  if (makeDefault) {
    await prisma.paymentMethod.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  }

  const method = await prisma.paymentMethod.create({
    data: { userId: user.id, type: body.type, label: body.label, isDefault: makeDefault },
  });

  return NextResponse.json(method, { status: 201 });
}