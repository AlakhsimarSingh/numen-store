import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateRawToken, hashToken } from "@/lib/auth/tokens";

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "numen_session";
const CUSTOMER_SESSION_DAYS = 60;
const ADMIN_SESSION_DAYS = 365;
const CUSTOMER_RENEW_THRESHOLD_DAYS = 15;

function setSessionCookie(raw: string, maxAgeDays: number) {
  return cookies().then((cookieStore) =>
    cookieStore.set(SESSION_COOKIE, raw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeDays * 24 * 60 * 60,
    })
  );
}

export async function createSession(userId: string, isAdmin: boolean, meta?: { userAgent?: string; ip?: string }) {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const days = isAdmin ? ADMIN_SESSION_DAYS : CUSTOMER_SESSION_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt, userAgent: meta?.userAgent, ip: meta?.ip },
  });

  await setSessionCookie(raw, days);
  return raw;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const tokenHash = hashToken(raw);
  const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const isAdmin = session.user.role === "ADMIN";

  if (isAdmin) {
    // Sliding on EVERY request for admins — an active admin session is
    // effectively never allowed to expire on its own. Only explicit logout
    // or manual revocation (see /api/admin/sessions) ends it.
    const newExpiry = new Date(Date.now() + ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt: newExpiry } });
    await setSessionCookie(raw, ADMIN_SESSION_DAYS);
  } else {
    // Customers: only renew once they're getting close to expiry, so we're
    // not writing to the DB on every single page load for regular shoppers.
    const daysLeft = (session.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft < CUSTOMER_RENEW_THRESHOLD_DAYS) {
      const newExpiry = new Date(Date.now() + CUSTOMER_SESSION_DAYS * 24 * 60 * 60 * 1000);
      await prisma.session.update({ where: { id: session.id }, data: { expiresAt: newExpiry } });
      await setSessionCookie(raw, CUSTOMER_SESSION_DAYS);
    }
  }

  return session.user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (raw) {
    const tokenHash = hashToken(raw);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  cookieStore.delete(SESSION_COOKIE);
}