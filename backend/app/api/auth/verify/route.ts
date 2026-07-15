import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { createSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const frontendUrl = process.env.FRONTEND_URL!;
  const raw = req.nextUrl.searchParams.get("token");

  if (!raw) {
    return NextResponse.redirect(new URL("/login?error=missing_token", frontendUrl));
  }

  const tokenHash = hashToken(raw);
  const magicLink = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });

  if (!magicLink || magicLink.purpose !== "CUSTOMER") {
    return NextResponse.redirect(new URL("/login?error=invalid_link", frontendUrl));
  }
  if (magicLink.consumedAt) {
    return NextResponse.redirect(new URL("/login?error=link_already_used", frontendUrl));
  }
  if (magicLink.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?error=link_expired", frontendUrl));
  }

  const user = await prisma.user.upsert({
    where: { email: magicLink.email },
    update: {},
    create: { email: magicLink.email, authProvider: "EMAIL" },
  });

  await prisma.magicLinkToken.update({
    where: { id: magicLink.id },
    data: { consumedAt: new Date(), userId: user.id },
  });

  await createSession(user.id, user.role === "ADMIN", {
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.redirect(new URL("/", frontendUrl));
}