import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";
import { sendMagicLinkEmail } from "@/lib/email/resend";

const LINK_EXPIRY_MINUTES = 15;

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const emailLimit = await checkRateLimit({
    identifier: normalizedEmail,
    scope: "customer_request_link",
    maxAttempts: 5,
    windowMinutes: 30,
  });
  const ipLimit = await checkRateLimit({
    identifier: ip,
    scope: "customer_request_link",
    maxAttempts: 15,
    windowMinutes: 30,
  });
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }
  await recordAttempt(normalizedEmail, "customer_request_link");
  await recordAttempt(ip, "customer_request_link");

  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + LINK_EXPIRY_MINUTES * 60 * 1000);

  await prisma.magicLinkToken.create({
    data: { email: normalizedEmail, tokenHash, expiresAt, purpose: "CUSTOMER" },
  });

  const verifyUrl = `${process.env.FRONTEND_URL}/api/auth/verify?token=${raw}`;
  await sendMagicLinkEmail(normalizedEmail, verifyUrl);

  // Always return success, whether or not the email exists — avoids leaking
  // which addresses are registered.
  return NextResponse.json({ ok: true });
}