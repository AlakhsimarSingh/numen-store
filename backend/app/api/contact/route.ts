import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";
import { sendContactNotificationEmail, sendContactConfirmationEmail } from "@/lib/email/resend";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (name.length < 2) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!topic) return NextResponse.json({ error: "Select a topic." }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "Tell us a bit more (10+ characters)." }, { status: 400 });
  if (message.length > 5000) return NextResponse.json({ error: "Message is too long." }, { status: 400 });

  const emailLimit = await checkRateLimit({ identifier: email, scope: "contact_submit", maxAttempts: 5, windowMinutes: 60 });
  const ipLimit = await checkRateLimit({ identifier: ip, scope: "contact_submit", maxAttempts: 15, windowMinutes: 60 });
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Too many messages sent. Try again shortly." }, { status: 429 });
  }
  await recordAttempt(email, "contact_submit");
  await recordAttempt(ip, "contact_submit");

  const user = await getCurrentUser();

  const created = await prisma.contactMessage.create({
    data: { name, email, topic, message, ip, userId: user?.id },
  });

  // Best-effort — a failed notification email should never block the customer's submission from succeeding.
  Promise.allSettled([
    sendContactNotificationEmail({ name, email, topic, message }),
    sendContactConfirmationEmail({ name, email, topic }),
  ]).catch(() => {});

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}