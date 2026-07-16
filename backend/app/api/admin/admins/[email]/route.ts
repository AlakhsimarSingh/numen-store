import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminEvent } from "@/lib/auth/auditLog";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail).toLowerCase();

  if (email === admin.email) {
    return NextResponse.json({ error: "You can't revoke your own admin access." }, { status: 400 });
  }

  const totalAdmins = await prisma.adminAllowlist.count();
  if (totalAdmins <= 1) {
    return NextResponse.json({ error: "Can't revoke the last remaining admin." }, { status: 400 });
  }

  const existing = await prisma.adminAllowlist.findUnique({ where: { email } });
  if (!existing) return NextResponse.json({ error: "Admin not found." }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { email } });

  await prisma.$transaction([
    prisma.adminAllowlist.delete({ where: { email } }),
    ...(user ? [prisma.user.update({ where: { email }, data: { role: "CUSTOMER" } })] : []),
    // Kick them out immediately — admin sessions slide indefinitely (see
    // createSession), so without this a revoked admin would stay logged in
    // for up to a year on any device where they're already signed in.
    ...(user ? [prisma.session.deleteMany({ where: { userId: user.id } })] : []),
  ]);

  await logAdminEvent({
    email: admin.email,
    action: "ADMIN_REVOKED",
    metadata: { revokedEmail: email },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}