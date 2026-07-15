"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";

const ease = [0.16, 1, 0.3, 1] as const;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    // Prototype only — simulate sending a reset email.
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 900);
  }

  return (
    <AuthCard
      title={sent ? "Check your inbox" : "Reset your password"}
      subtitle={
        sent
          ? `We sent a reset link to ${email}.`
          : "Enter the email tied to your account and we'll send a reset link."
      }
      footer={
        <Link href="/login" className="inline-flex items-center gap-1.5 text-muted hover:text-accent">
          <ArrowLeft size={14} /> Back to login
        </Link>
      }
    >
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease }}
            className="flex flex-col items-center gap-4 py-4 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
              <MailCheck size={26} />
            </div>
            <p className="font-body text-sm text-muted">
              Didn&apos;t get it? Check spam, or
              <button
                onClick={() => setSent(false)}
                className="ml-1 text-accent hover:underline"
              >
                try another email
              </button>
              .
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label htmlFor="reset-email" className="mb-1.5 block font-body text-xs text-muted">
                Email
              </label>
              <div
                className={`flex items-center gap-2.5 rounded-xl border bg-bg px-4 py-3 ${
                  error ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
                }`}
              >
                <Mail size={16} className="shrink-0 text-muted" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                />
              </div>
              {error && <p className="mt-1.5 font-mono text-[11px] text-accent2">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthCard>
  );
}