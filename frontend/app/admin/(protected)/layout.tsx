import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "numen_session";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

// Verifies the session server-side, before anything (including the
// sidebar) ever gets sent to the browser. This runs in addition to
// middleware.ts, not instead of it:
//   - middleware.ts rejects unauthorized requests early, at the edge,
//     before any route handler or React render runs, and covers every
//     path under /admin/* (including ones this layout doesn't wrap).
//   - this layout is the last line of defense for the pages it wraps —
//     if middleware's matcher were ever misconfigured, or a request
//     reached this layout some other way, no admin UI renders without
//     this check independently confirming role === "ADMIN" too.
// Both call the same backend endpoint, which is the only source of truth
// for who a session actually belongs to.
async function getVerifiedAdmin() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { cookie: `${SESSION_COOKIE}=${raw}` },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data?.user?.role === "ADMIN") return data.user;
    return null;
  } catch {
    return null;
  }
}

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await getVerifiedAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="-mt-20 min-h-screen bg-bg">
      <AdminSidebar />
      <div className="lg:pl-64">
        <main className="px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}