export interface Review {
  id: string;
  productId: string;
  authorName: string;
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  userVoted: boolean;
  isOwn: boolean;
}

export interface Testimonial {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  productName?: string;
  productSlug?: string;
}

export type AdminReview = Review & { productName?: string; productSlug?: string };

export async function fetchProductReviews(productId: string): Promise<Review[]> {
  const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load reviews.");
  return res.json();
}

export async function fetchAllReviews(): Promise<AdminReview[]> {
  const res = await fetch("/api/reviews", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load reviews.");
  return res.json();
}

export async function submitReview(input: {
  productId: string;
  rating: number;
  title?: string;
  comment: string;
}): Promise<Review> {
  const res = await fetch("/api/reviews", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to submit review.");
  return data;
}

export async function markReviewHelpful(id: string): Promise<{ helpfulCount: number; userVoted: boolean }> {
  const res = await fetch(`/api/reviews/${id}/helpful`, { method: "POST", credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to vote.");
  return data;
}

export async function deleteReview(id: string): Promise<void> {
  const res = await fetch(`/api/reviews/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to delete review.");
  }
}

/**
 * baseRating/baseCount simulate pre-existing "seed" reviews so products
 * don't launch at zero — same blending approach as before, now applied to
 * real server-fetched reviews instead of local-store ones.
 */
export function computeRatingSummary(baseRating: number, baseCount: number, reviews: Review[]) {
  const totalCount = baseCount + reviews.length;
  const weightedSum = baseRating * baseCount + reviews.reduce((sum, r) => sum + r.rating, 0);
  const average = totalCount > 0 ? weightedSum / totalCount : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const realCount = reviews.filter((r) => r.rating === star).length;
    const seedShare = star === Math.round(baseRating) ? baseCount : Math.round(baseCount * 0.08);
    const count = realCount + seedShare;
    return { star, count };
  });

  const distTotal = distribution.reduce((sum, d) => sum + d.count, 0) || 1;

  return {
    average: Math.round(average * 10) / 10,
    totalCount,
    distribution: distribution.map((d) => ({ ...d, percent: Math.round((d.count / distTotal) * 100) })),
  };
}