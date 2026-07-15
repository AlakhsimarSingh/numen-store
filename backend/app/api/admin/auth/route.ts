import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";
import { createSession } from "@/lib/auth/session";
import { logAdminEvent } from "@/lib/auth/auditLog";
import { sendAdminMagicLinkEmail } from "@/lib/email/resend";

const LINK_EXPIRY_MINUTES = 10;

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  const ip = req.headers.get("x-forwarded-for") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const emailLimit = await checkRateLimit({
    identifier: normalizedEmail,
    scope: "admin_request_link",
    maxAttempts: 5,
    windowMinutes: 30,
  });
  const ipLimit = await checkRateLimit({
    identifier: ip ?? "unknown",
    scope: "admin_request_link",
    maxAttempts: 15,
    windowMinutes: 30,
  });
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }
  await recordAttempt(normalizedEmail, "admin_request_link");
  await recordAttempt(ip ?? "unknown", "admin_request_link");

  const allowed = await prisma.adminAllowlist.findUnique({ where: { email: normalizedEmail } });

  if (allowed) {
    const raw = generateRawToken();
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + LINK_EXPIRY_MINUTES * 60 * 1000);

    await prisma.magicLinkToken.create({
      data: { email: normalizedEmail, tokenHash, expiresAt, purpose: "ADMIN" },
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/api/admin/auth?token=${raw}`;
    await sendAdminMagicLinkEmail(normalizedEmail, verifyUrl, { ip, userAgent });

    await logAdminEvent({ email: normalizedEmail, action: "LOGIN_LINK_REQUESTED", success: true, ip, userAgent });
  } else {
    // Don't leak allowlist membership — log internally, but respond identically either way.
    await logAdminEvent({ email: normalizedEmail, action: "LOGIN_LINK_REQUESTED_NOT_ALLOWLISTED", success: false, ip, userAgent });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const frontendUrl = process.env.FRONTEND_URL!;
  const token = req.nextUrl.searchParams.get("token");
  const ip = req.headers.get("x-forwarded-for") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login?error=missing_token", frontendUrl));
  }

  const tokenHash = hashToken(token);
  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });

  if (!record || record.purpose !== "ADMIN" || record.consumedAt || record.expiresAt < new Date()) {
    await logAdminEvent({ email: record?.email ?? "unknown", action: "LOGIN_VERIFY_FAILED", success: false, ip, userAgent });
    return NextResponse.redirect(new URL("/admin/login?error=expired_link", frontendUrl));
  }

  const stillAllowed = await prisma.adminAllowlist.findUnique({ where: { email: record.email } });
  if (!stillAllowed) {
    await logAdminEvent({ email: record.email, action: "LOGIN_VERIFY_DEALLOWLISTED", success: false, ip, userAgent });
    return NextResponse.redirect(new URL("/admin/login?error=not_authorized", frontendUrl));
  }

  await prisma.magicLinkToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });

  const user = record.userId
    ? await prisma.user.findUnique({ where: { id: record.userId } })
    : await prisma.user.findUnique({ where: { email: record.email } });

  if (!user || user.role !== "ADMIN") {
    await logAdminEvent({ email: record.email, action: "LOGIN_VERIFY_ROLE_MISMATCH", success: false, ip, userAgent });
    return NextResponse.redirect(new URL("/admin/login?error=not_authorized", frontendUrl));
  }

  await createSession(user.id, true, { userAgent, ip });
  await logAdminEvent({ email: user.email, action: "LOGIN_SUCCESS", success: true, ip, userAgent });

  return NextResponse.redirect(new URL("/admin", frontendUrl));
}