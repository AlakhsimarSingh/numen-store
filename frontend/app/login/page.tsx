"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";
import GoogleButton from "@/components/auth/GoogleButton";
import PasswordInput from "@/components/auth/PasswordInput";
import { useAuthStore } from "@/src/hooks/useAuthStore";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const redirectTo = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
      title="Welcome back"
      subtitle="Log in to keep tracking your drops."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block font-body text-xs text-muted">
            Email
          </label>
          <div
            className={`flex items-center gap-2.5 rounded-xl border bg-bg px-4 py-3 ${
              errors.email ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
            }`}
          >
            <Mail size={16} className="shrink-0 text-muted" />
            <input
              id="email"
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

        <PasswordInput id="password" label="Password" value={password} onChange={setPassword} error={errors.password} />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="font-body text-xs text-muted hover:text-accent">
            Forgot password?
          </Link>
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
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/5" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">or</span>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      <GoogleButton label="Log in with Google" redirectTo={redirectTo} />
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}