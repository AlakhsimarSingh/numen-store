import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminEvent } from "@/lib/auth/auditLog";
import { serializeAdmin } from "@/lib/admin/admins";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowlist = await prisma.adminAllowlist.findMany({ orderBy: { addedAt: "desc" } });
  const emails = allowlist.map((a) => a.email);
  const users = await prisma.user.findMany({ where: { email: { in: emails } } });
  const userByEmail = new Map(users.map((u) => [u.email, u]));

  const entries = allowlist.map((a) => serializeAdmin({ ...a, user: userByEmail.get(a.email) ?? null }));
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : null;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const existingAllowlist = await prisma.adminAllowlist.findUnique({ where: { email } });
  if (existingAllowlist) {
    return NextResponse.json({ error: "This email already has admin access." }, { status: 409 });
  }

  // The two-part fix: allowlisting alone was never enough — a matching
  // User row with role ADMIN is required too (this is exactly what blocked
  // the very first admin login on this project). Do both atomically here so
  // this page is the one path that can never produce a half-configured admin.
  const [allowlistEntry] = await prisma.$transaction([
    prisma.adminAllowlist.create({ data: { email, addedBy: admin.email, note } }),
    prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN" },
      create: { email, role: "ADMIN", authProvider: "EMAIL" },
    }),
  ]);

  await logAdminEvent({
    email: admin.email,
    action: "ADMIN_ADDED",
    metadata: { addedEmail: email },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  const user = await prisma.user.findUnique({ where: { email } });
  return NextResponse.json(serializeAdmin({ ...allowlistEntry, user }), { status: 201 });
}