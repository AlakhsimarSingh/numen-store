"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { fetchAllReviews, deleteReview, AdminReview } from "@/src/lib/reviews";
import { useToastStore } from "@/src/hooks/useToastStore";
import { StarRatingDisplay } from "@/components/product/StarRating";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((s) => s.show);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAllReviews()
      .then((data) => {
        if (!cancelled) setReviews(data);
      })
      .catch((err) => {
        if (!cancelled) showToast(err instanceof Error ? err.message : "Failed to load reviews", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const filtered = reviews.filter(
    (r) => r.comment.toLowerCase().includes(query.toLowerCase()) || r.authorName.toLowerCase().includes(query.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    try {
      await deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      showToast("Review deleted", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete review", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Reviews</h1>
      <p className="mt-1 font-body text-sm text-muted">{reviews.length} total reviews across all products</p>

      <div className="mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-surface px-4 py-2.5">
        <Search size={15} className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by author or content…"
          className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </div>

      <div className="mt-6 space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/5 bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <StarRatingDisplay rating={r.rating} size={13} />
                  <span className="font-body text-xs text-ink">{r.authorName}</span>
                  {r.verifiedPurchase && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-accent">Verified</span>
                  )}
                </div>
                {r.productName && <p className="mt-1 font-mono text-[10px] text-muted">on {r.productName}</p>}
              </div>
              <button onClick={() => handleDelete(r.id)} className="text-muted hover:text-accent2">
                <Trash2 size={15} />
              </button>
            </div>
            {r.title && <p className="mt-2 font-body text-sm font-semibold text-ink">{r.title}</p>}
            <p className="mt-1 font-body text-sm text-muted">{r.comment}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center font-body text-sm text-muted">No reviews match your search.</p>
        )}
      </div>
    </div>
  );
}