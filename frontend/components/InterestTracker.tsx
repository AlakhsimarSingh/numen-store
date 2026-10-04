"use client";

import { useEffect } from "react";
import { useInterestStore, type InterestEvent } from "@/src/hooks/useInterestStore";

/**
 * Drop into any (server) page to record an interest signal on mount:
 *   <InterestTracker categorySlug={product.categorySlug} productId={product.id} />
 *   <InterestTracker categorySlug={category.slug} event="category" />
 */
export default function InterestTracker({
  categorySlug,
  productId,
  event = "view",
}: {
  categorySlug?: string | null;
  productId?: string | number;
  event?: InterestEvent;
}) {
  useEffect(() => {
    useInterestStore.getState().track(categorySlug, event, productId);
  }, [categorySlug, productId, event]);

  return null;
}