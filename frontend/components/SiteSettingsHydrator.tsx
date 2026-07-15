"use client";
import { useEffect } from "react";
import { useSiteSettingsStore } from "@/src/hooks/useSiteSettingsStore";

export default function SiteSettingsHydrator() {
  useEffect(() => {
    useSiteSettingsStore.getState().fetchFromServer();
  }, []);

  return null;
}