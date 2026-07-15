import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, isPasswordStrongEnough } from "@/lib/auth/password";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";
import { createSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }
  if (!password || !isPasswordStrongEnough(password)) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const emailLimit = await checkRateLimit({ identifier: email.toLowerCase(), scope: "signup", maxAttempts: 5, windowMinutes: 60 });
  const ipLimit = await checkRateLimit({ identifier: ip, scope: "signup", maxAttempts: 15, windowMinutes: 60 });
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }
  await recordAttempt(email.toLowerCase(), "signup");
  await recordAttempt(ip, "signup");

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing?.passwordHash) {
    return NextResponse.json({ error: "An account with this email already exists. Try logging in instead." }, { status: 409 });
  }
  if (existing?.authProvider === "GOOGLE" && !existing.passwordHash) {
    return NextResponse.json({ error: "This email is registered via Google. Use \"Continue with Google\" to log in." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { passwordHash, name: name.trim() },
    create: { email: normalizedEmail, name: name.trim(), passwordHash, authProvider: "EMAIL" },
  });

  await createSession(user.id, false, {
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip,
  });

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}