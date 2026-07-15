import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { sendContactReplyEmail } from "@/lib/email/resend";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Message not found." }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!["OPEN", "IN_PROGRESS", "RESOLVED"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = body.status;
  }

  if (body.reply !== undefined) {
    const reply = String(body.reply).trim();
    if (!reply) return NextResponse.json({ error: "Reply cannot be empty." }, { status: 400 });
    data.reply = reply;
    data.repliedAt = new Date();
    data.repliedBy = admin.email;
    if (data.status === undefined) data.status = "RESOLVED"; // replying implicitly resolves, unless status was also explicitly set
  }

  const updated = await prisma.contactMessage.update({ where: { id }, data });

  if (body.reply !== undefined) {
    // Best-effort — the reply is saved regardless of whether the email send succeeds.
    sendContactReplyEmail({
      to: existing.email,
      name: existing.name,
      originalMessage: existing.message,
      reply: String(body.reply).trim(),
    }).catch((err) => console.error("Failed to send contact reply email:", err));
  }

  return NextResponse.json(updated);
}