import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: { isDefault: "desc" },
  });

  return NextResponse.json(addresses);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.fullName || !body?.phone || !body?.addressLine1 || !body?.city || !body?.state || !body?.zip || !body?.country) {
    return NextResponse.json({ error: "Missing required address fields." }, { status: 400 });
  }

  const existingCount = await prisma.address.count({ where: { userId: user.id } });
  const makeDefault = body.isDefault || existingCount === 0;

  if (makeDefault) {
    await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  }

  const address = await prisma.address.create({
    data: {
      userId: user.id,
      label: body.label || "Home",
      fullName: body.fullName,
      phone: body.phone,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2 || null,
      city: body.city,
      state: body.state,
      zip: body.zip,
      country: body.country,
      lat: typeof body.lat === "number" ? body.lat : null,
      lng: typeof body.lng === "number" ? body.lng : null,
      isDefault: makeDefault,
    },
  });

  return NextResponse.json(address, { status: 201 });
}