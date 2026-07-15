import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/tokens";
import { logAdminEvent } from "@/lib/auth/auditLog";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentToken = req.cookies.get(process.env.SESSION_COOKIE_NAME ?? "numen_session")?.value;
  const currentHash = currentToken ? hashToken(currentToken) : null;

  const sessions = await prisma.session.findMany({
    where: { userId: admin.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, tokenHash: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.tokenHash === currentHash,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json();
  const session = await prisma.session.findUnique({ where: { id: sessionId } });

  if (!session || session.userId !== admin.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.session.delete({ where: { id: sessionId } });
  await logAdminEvent({
    email: admin.email,
    action: "SESSION_REVOKED",
    metadata: { revokedSessionId: sessionId },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}