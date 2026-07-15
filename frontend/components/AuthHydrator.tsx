"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/src/hooks/useAuthStore";
import { useWishlistStore } from "@/src/hooks/useWishlistStore";

export default function AuthHydrator() {
  const fetchSession = useAuthStore((s) => s.fetchSession);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hydrateWishlist = useWishlistStore((s) => s.hydrate);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (isLoggedIn) hydrateWishlist();
  }, [isLoggedIn, hydrateWishlist]);

  return null;
}