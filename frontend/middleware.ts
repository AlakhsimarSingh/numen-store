import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "numen_session";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

function redirectToLogin(req: NextRequest, from: string) {
  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("next", from);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLoginRoute = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin") && !isLoginRoute;

  if (!isAdminRoute) return NextResponse.next();

  const rawCookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!rawCookie) return redirectToLogin(req, pathname);

  // A cookie merely being *present* proves nothing about who it belongs to
  // — customers get the exact same session cookie name as admins. The only
  // way to know this request actually belongs to an ADMIN is to ask the
  // backend, which is the sole holder of the session table and the user's
  // role. Forward the incoming Cookie header as-is rather than
  // reconstructing it, so nothing about the session gets lost in transit.
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });

    if (!res.ok) return redirectToLogin(req, pathname);

    const data = await res.json();
    if (!data?.user || data.user.role !== "ADMIN") {
      return redirectToLogin(req, pathname);
    }
  } catch {
    // Backend unreachable or verification failed — fail closed, never open.
    return redirectToLogin(req, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};