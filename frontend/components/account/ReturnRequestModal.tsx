"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { requestOrderReturn, Order } from "@/src/lib/orders";
import { useToastStore } from "@/src/hooks/useToastStore";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;
const reasons = ["Wrong size", "Changed my mind", "Item damaged/defective", "Not as described", "Other"];

export default function ReturnRequestModal({
  orderId,
  onClose,
  onSuccess,
}: {
  orderId: string;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}) {
  const showToast = useToastStore((s) => s.show);

  const [reason, setReason] = useState(reasons[0]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const updated = await requestOrderReturn(orderId, reason, comment);
      onSuccess(updated);
      showToast("Return request submitted");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.3, ease }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">Request a Return</h3>
            <button onClick={onClose} className="text-muted hover:text-ink">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block font-body text-xs text-muted">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block font-body text-xs text-muted">Additional details (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
              />
            </div>

            {error && <p className="font-mono text-[11px] text-accent2">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:opacity-70"
              )}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}