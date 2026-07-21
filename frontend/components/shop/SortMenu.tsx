"use client";

import { useState } from "react";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

// Custom dropdown instead of a native <select> — gives us full control over
// styling (checkmarks, hover states, animation) so it actually matches the
// rest of the UI on both desktop and mobile, instead of falling back to
// whatever the OS/browser renders for <select>.
export function SortMenu<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SortOption<T>[];
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-full border px-4 py-2 font-body text-xs transition-colors",
          open ? "border-accent text-accent" : "border-white/10 text-ink hover:border-white/20"
        )}
      >
        <ArrowUpDown size={13} className={open ? "text-accent" : "text-muted"} />
        {current?.label}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-3 text-left font-body text-xs transition-colors hover:bg-surface2",
                  opt.value === value ? "text-accent" : "text-ink"
                )}
              >
                {opt.label}
                {opt.value === value && <Check size={14} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}