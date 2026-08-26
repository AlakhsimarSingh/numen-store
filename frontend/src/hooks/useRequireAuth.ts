"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/src/hooks/useAuthStore";

export function useRequireAuth(redirectTo = "/login") {
  const router = useRouter();
  const pathname = usePathname();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hydrated = useAuthStore((s) => s.hydrated);
  const fetchSession = useAuthStore((s) => s.fetchSession);

  // Kick off the real session check if nothing has hydrated the store yet
  // (e.g. a hard refresh landed directly on this page). Safe to call even
  // if a root-level provider already triggered it — fetchSession just
  // re-resolves the same /api/auth/me call.
  useEffect(() => {
    if (!hydrated) fetchSession();
  }, [hydrated, fetchSession]);

  // Only decide to redirect once the session check has actually resolved —
  // never on a bare "component mounted" signal, which was the bug: it fired
  // before fetchSession had a chance to confirm the user was still logged in.
  useEffect(() => {
    if (hydrated && !isLoggedIn) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`${redirectTo}?next=${next}`);
    }
  }, [hydrated, isLoggedIn, redirectTo, router, pathname]);

  return { ready: hydrated && isLoggedIn };
}