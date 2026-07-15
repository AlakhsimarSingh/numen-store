"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ThumbsUp } from "lucide-react";
import { Product } from "@/src/types";
import { useAuthStore } from "@/src/hooks/useAuthStore";
import { computeRatingSummary, markReviewHelpful, submitReview, Review } from "@/src/lib/reviews";
import { StarRatingDisplay, StarRatingInput } from "./StarRating";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;
type SortKey = "newest" | "highest" | "lowest" | "helpful";

export default function ReviewsSection({
  product,
  reviews,
  loading,
  onReviewsChange,
}: {
  product: Product;
  reviews: Review[];
  loading: boolean;
  onReviewsChange: (updater: Review[] | ((prev: Review[]) => Review[])) => void;
}) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const summary = useMemo(() => computeRatingSummary(product.rating, 12, reviews), [product.rating, reviews]);

  const [sort, setSort] = useState<SortKey>("newest");
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  const alreadyReviewed = reviews.some((r) => r.isOwn);

  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    switch (sort) {
      case "highest":
        return list.sort((a, b) => b.rating - a.rating);
      case "lowest":
        return list.sort((a, b) => a.rating - b.rating);
      case "helpful":
        return list.sort((a, b) => b.helpfulCount - a.helpfulCount);
      default:
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [reviews, sort]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Select a star rating.");
      return;
    }
    if (comment.trim().length < 10) {
      setError("Write at least 10 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const created = await submitReview({
        productId: product.id,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });
      onReviewsChange((prev) => [created, ...prev]);
      setSubmitted(true);
      setShowForm(false);
      setRating(0);
      setTitle("");
      setComment("");
      setTimeout(() => setSubmitted(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkHelpful(id: string) {
    setVotingId(id);
    try {
      const { helpfulCount, userVoted } = await markReviewHelpful(id);
      onReviewsChange((prev) => prev.map((r) => (r.id === id ? { ...r, helpfulCount, userVoted } : r)));
    } catch {
      // Already voted, or a network hiccup — nothing disruptive to show, the button state below already reflects reality.
    } finally {
      setVotingId(null);
    }
  }

  return (
    <div className="mt-20 border-t border-white/5 pt-12">
      <h2 className="font-display text-2xl font-bold text-ink">Reviews</h2>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease }}
          className="h-fit rounded-2xl border border-white/5 bg-surface p-6"
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl font-bold text-ink">{summary.average.toFixed(1)}</span>
            <div>
              <StarRatingDisplay rating={summary.average} size={16} />
              <p className="mt-1 font-body text-xs text-muted">{summary.totalCount} review{summary.totalCount !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {summary.distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2">
                <span className="w-3 font-mono text-[11px] text-muted">{d.star}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${d.percent}%` }} />
                </div>
                <span className="w-8 text-right font-mono text-[10px] text-muted">{d.percent}%</span>
              </div>
            ))}
          </div>

          {isLoggedIn ? (
            alreadyReviewed ? (
              <p className="mt-5 flex items-center gap-1.5 font-body text-xs text-muted">
                <CheckCircle2 size={13} className="text-accent" /> You&apos;ve reviewed this product
              </p>
            ) : (
              <button
                onClick={() => setShowForm((v) => !v)}
                className="mt-5 w-full rounded-full bg-accent py-2.5 font-body text-xs font-semibold text-bg transition-transform hover:scale-[1.02]"
              >
                {showForm ? "Cancel" : "Write a Review"}
              </button>
            )
          ) : (
            <p className="mt-5 font-body text-xs text-muted">
              <Link href="/login" className="text-accent hover:underline">
                Log in
              </Link>{" "}
              to write a review.
            </p>
          )}

          {submitted && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 font-mono text-[11px] text-accent"
            >
              Review posted — thank you!
            </motion.p>
          )}
        </motion.div>

        {/* List + form */}
        <div>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease }}
              onSubmit={handleSubmit}
              className="mb-6 space-y-4 rounded-2xl border border-white/5 bg-surface p-6"
            >
              <div>
                <label className="mb-2 block font-body text-xs text-muted">Your rating</label>
                <StarRatingInput value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Title (optional)</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sum it up in a few words"
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Review</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="How was the fit, quality, sizing?"
                  className="w-full resize-none rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              {error && <p className="font-mono text-[11px] text-accent2">{error}</p>}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-body text-xs font-semibold text-bg transition-transform hover:scale-[1.02] disabled:opacity-70"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? "Posting…" : "Post Review"}
                </button>
                <p className="font-body text-[11px] text-muted">Verified Purchase badges are added automatically.</p>
              </div>
            </motion.form>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-muted" size={22} />
            </div>
          ) : (
            <>
              {reviews.length > 0 && (
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-body text-xs text-muted">{reviews.length} customer review{reviews.length !== 1 ? "s" : ""}</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="rounded-full border border-white/10 bg-surface px-3 py-1.5 font-body text-xs text-ink focus:outline-none"
                  >
                    <option value="newest">Newest</option>
                    <option value="highest">Highest rated</option>
                    <option value="lowest">Lowest rated</option>
                    <option value="helpful">Most helpful</option>
                  </select>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-surface p-10 text-center">
                  <p className="font-body text-sm text-muted">No written reviews yet — be the first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedReviews.map((review, i) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.35, delay: (i % 6) * 0.04, ease }}
                      className="rounded-2xl border border-white/5 bg-surface p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <StarRatingDisplay rating={review.rating} size={13} />
                            {review.verifiedPurchase && (
                              <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                                <CheckCircle2 size={10} /> Verified
                              </span>
                            )}
                          </div>
                          {review.title && (
                            <p className="mt-2 font-body text-sm font-semibold text-ink">{review.title}</p>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-muted">
                          {new Date(review.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      <p className="mt-2 font-body text-sm leading-relaxed text-muted">{review.comment}</p>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-body text-xs text-ink/70">{review.authorName}</span>
                        <button
                          onClick={() => handleMarkHelpful(review.id)}
                          disabled={review.userVoted || votingId === review.id}
                          className={cn(
                            "flex items-center gap-1.5 font-body text-xs transition-colors",
                            review.userVoted ? "text-accent" : "text-muted hover:text-ink"
                          )}
                        >
                          {votingId === review.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ThumbsUp size={12} className={review.userVoted ? "fill-accent" : ""} />
                          )}
                          Helpful{review.helpfulCount > 0 ? ` (${review.helpfulCount})` : ""}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}