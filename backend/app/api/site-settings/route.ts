import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import type { SiteSettings } from "@prisma/client";

function serialize(s: SiteSettings) {
  return {
    siteName: s.siteName,
    tagline: s.tagline,
    heroHeadlineLines: s.heroHeadlineLines,
    heroSubtext: s.heroSubtext,
    heroImage: s.heroImage,
    freeShippingThreshold: Number(s.freeShippingThreshold),
    shippingFee: Number(s.shippingFee),
    taxRate: s.taxRate,
    codFee: Number(s.codFee),
    announcementEnabled: s.announcementEnabled,
    announcementText: s.announcementText,
    maintenanceMode: s.maintenanceMode,
  };
}

export async function GET() {
    console.log("DB URL loaded:", !!process.env.DATABASE_URL, process.env.DATABASE_URL?.slice(0, 30));
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return NextResponse.json(serialize(settings));
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const updated = await prisma.siteSettings.update({
    where: { id: 1 },
    data: {
      siteName: body.siteName,
      tagline: body.tagline,
      heroHeadlineLines: body.heroHeadlineLines,
      heroSubtext: body.heroSubtext,
      heroImage: body.heroImage,
      freeShippingThreshold: body.freeShippingThreshold,
      shippingFee: body.shippingFee,
      taxRate: body.taxRate,
      codFee: body.codFee,
      announcementEnabled: body.announcementEnabled,
      announcementText: body.announcementText,
      maintenanceMode: body.maintenanceMode,
    },
  });
  return NextResponse.json(serialize(updated));
}