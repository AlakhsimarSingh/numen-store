"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-body text-xs text-muted">
        {label}
      </label>
      <div
        className={`flex items-center gap-2.5 rounded-xl border bg-bg px-4 py-3 ${
          error ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
        }`}
      >
        <Lock size={16} className="shrink-0 text-muted" />
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="shrink-0 text-muted transition-colors hover:text-ink"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="mt-1.5 font-mono text-[11px] text-accent2">{error}</p>}
    </div>
  );
}