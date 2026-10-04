"use client";

import { useEffect } from "react";
import { useInterestStore } from "@/src/hooks/useInterestStore";

export default function ProductViewTracker({
  categorySlug,
  productId,
}: {
  categorySlug: string;
  productId: string | number;
}) {
  useEffect(() => {
    useInterestStore.getState().track(categorySlug, "view", productId);
  }, [categorySlug, productId]);

  return null;
}