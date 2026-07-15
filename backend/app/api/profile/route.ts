import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

function serializeProfile(user: {
  phone: string | null;
  gender: string | null;
  dob: Date | null;
  sizeTop: string | null;
  sizeBottom: string | null;
  sizeShoe: string | null;
  favoriteCategories: string[];
  styleTags: string[];
  notifyEmailDeals: boolean;
  notifySmsDeals: boolean;
  notifyOrderUpdates: boolean;
  notifyNewDrops: boolean;
}) {
  return {
    phone: user.phone ?? "",
    gender: user.gender ?? "",
    dob: user.dob ? user.dob.toISOString().slice(0, 10) : "",
    sizes: { top: user.sizeTop ?? "", bottom: user.sizeBottom ?? "", shoe: user.sizeShoe ?? "" },
    favoriteCategories: user.favoriteCategories,
    styleTags: user.styleTags,
    notifications: {
      emailDeals: user.notifyEmailDeals,
      smsDeals: user.notifySmsDeals,
      orderUpdates: user.notifyOrderUpdates,
      newDrops: user.notifyNewDrops,
    },
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(serializeProfile(user));
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (typeof body.phone === "string") data.phone = body.phone;
  if (typeof body.gender === "string") data.gender = body.gender;
  if (typeof body.dob === "string" && body.dob) data.dob = new Date(body.dob);
  if (body.sizes) {
    if (typeof body.sizes.top === "string") data.sizeTop = body.sizes.top;
    if (typeof body.sizes.bottom === "string") data.sizeBottom = body.sizes.bottom;
    if (typeof body.sizes.shoe === "string") data.sizeShoe = body.sizes.shoe;
  }
  if (Array.isArray(body.favoriteCategories)) data.favoriteCategories = body.favoriteCategories;
  if (Array.isArray(body.styleTags)) data.styleTags = body.styleTags;
  if (body.notifications) {
    if (typeof body.notifications.emailDeals === "boolean") data.notifyEmailDeals = body.notifications.emailDeals;
    if (typeof body.notifications.smsDeals === "boolean") data.notifySmsDeals = body.notifications.smsDeals;
    if (typeof body.notifications.orderUpdates === "boolean") data.notifyOrderUpdates = body.notifications.orderUpdates;
    if (typeof body.notifications.newDrops === "boolean") data.notifyNewDrops = body.notifications.newDrops;
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });

  return NextResponse.json(serializeProfile(updated));
}