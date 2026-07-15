"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Mail, ShieldCheck } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: "That link is missing required info. Request a new one.",
  expired_link: "That link has expired or was already used. Request a new one.",
  not_authorized: "That email isn't authorized for admin access.",
};

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Try again.");
    }
    setSubmitting(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="w-full max-w-sm rounded-2xl border border-white/5 bg-surface p-8"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        <ShieldCheck size={22} />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold text-ink">Admin sign-in</h1>
      <p className="mt-1.5 font-body text-sm text-muted">
        Enter your admin email and we'll send you a sign-in link.
      </p>

      {errorCode && (
        <p className="mt-4 rounded-lg border border-accent2/30 bg-accent2/10 px-3 py-2 font-mono text-[11px] text-accent2">
          {ERROR_MESSAGES[errorCode] ?? "Something went wrong. Try again."}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-accent2/30 bg-accent2/10 px-3 py-2 font-mono text-[11px] text-accent2">
          {error}
        </p>
      )}

      {sent ? (
        <div className="mt-6 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
          <p className="font-body text-sm text-ink">Check your inbox.</p>
          <p className="mt-1 font-body text-xs text-muted">
            If that email is authorized, a sign-in link is on its way. It expires in 10 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-bg px-4 py-3 focus-within:border-accent/50">
            <Mail size={16} className="shrink-0 text-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      )}
    </motion.div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <Suspense fallback={<Loader2 className="animate-spin text-muted" size={28} />}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}