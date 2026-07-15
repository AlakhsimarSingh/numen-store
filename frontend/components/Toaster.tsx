"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore, Toast } from "@/src/hooks/useToastStore";
import { cn } from "@/src/lib/utils";

const AUTO_DISMISS_MS = 3200;
const ease = [0.16, 1, 0.3, 1] as const;

const iconMap: Record<Toast["variant"], typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  const Icon = iconMap[toast.variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md",
        toast.variant === "success" && "border-accent/30 bg-surface/95",
        toast.variant === "error" && "border-accent2/30 bg-surface/95",
        toast.variant === "info" && "border-white/10 bg-surface/95"
      )}
    >
      <Icon
        size={17}
        className={cn(
          toast.variant === "success" && "text-accent",
          toast.variant === "error" && "text-accent2",
          toast.variant === "info" && "text-muted"
        )}
      />
      <p className="font-body text-sm text-ink">{toast.message}</p>
      <button onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="ml-1 text-muted hover:text-ink">
        <X size={14} />
      </button>
    </motion.div>
  );
}

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed left-1/2 top-24 z-[90] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}