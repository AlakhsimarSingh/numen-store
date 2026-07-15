import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";
import { createSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  if (!email || typeof email !== "string" || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const emailLimit = await checkRateLimit({
    identifier: normalizedEmail,
    scope: "customer_login",
    maxAttempts: 8,
    windowMinutes: 30,
  });
  const ipLimit = await checkRateLimit({ identifier: ip, scope: "customer_login", maxAttempts: 20, windowMinutes: 30 });
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }
  await recordAttempt(normalizedEmail, "customer_login");
  await recordAttempt(ip, "customer_login");

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id, user.role === "ADMIN", {
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip,
  });

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}