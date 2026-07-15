"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, User } from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";
import GoogleButton from "@/components/auth/GoogleButton";
import PasswordInput from "@/components/auth/PasswordInput";
import { useAuthStore } from "@/src/hooks/useAuthStore";
import { cn } from "@/src/lib/utils";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
  form?: string;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const redirectTo = searchParams.get("next") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const next: FormErrors = {};
    if (name.trim().length < 2) next.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords don't match.";
    if (!agreed) next.terms = "You must accept the Terms to continue.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.error ?? "Something went wrong. Try again." });
        setLoading(false);
        return;
      }

      login({ id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role ?? "CUSTOMER" });
      router.push(redirectTo);
    } catch {
      setErrors({ form: "Couldn't reach the server. Try again." });
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join for first access to every drop."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block font-body text-xs text-muted">
            Full name
          </label>
          <div
            className={`flex items-center gap-2.5 rounded-xl border bg-bg px-4 py-3 ${
              errors.name ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
            }`}
          >
            <User size={16} className="shrink-0 text-muted" />
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
              autoComplete="name"
              className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          {errors.name && <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="signup-email" className="mb-1.5 block font-body text-xs text-muted">
            Email
          </label>
          <div
            className={`flex items-center gap-2.5 rounded-xl border bg-bg px-4 py-3 ${
              errors.email ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
            }`}
          >
            <Mail size={16} className="shrink-0 text-muted" />
            <input
              id="signup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          {errors.email && <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.email}</p>}
        </div>

        <PasswordInput
          id="signup-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={errors.password}
        />

        <PasswordInput
          id="confirm-password"
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          error={errors.confirm}
        />

        <div>
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 rounded border bg-bg accent-[var(--color-accent)]",
                errors.terms ? "border-accent2/60" : "border-white/10"
              )}
            />
            <span className="font-body text-xs text-muted">
              I agree to the{" "}
              <a href="/terms" className="text-ink underline hover:text-accent">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-ink underline hover:text-accent">
                Privacy Policy
              </a>
              .
            </span>
          </label>
          {errors.terms && <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.terms}</p>}
        </div>

        {errors.form && (
          <p className="rounded-lg border border-accent2/30 bg-accent2/10 px-3 py-2 font-mono text-[11px] text-accent2">
            {errors.form}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/5" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">or</span>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      <GoogleButton label="Sign up with Google" redirectTo={redirectTo} />
    </AuthCard>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}