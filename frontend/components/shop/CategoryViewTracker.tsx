"use client";

import { useEffect } from "react";
import { useInterestStore } from "@/src/hooks/useInterestStore";

export default function CategoryViewTracker({ categorySlug }: { categorySlug: string }) {
  useEffect(() => {
    useInterestStore.getState().track(categorySlug, "category");
  }, [categorySlug]);

  return null;
}