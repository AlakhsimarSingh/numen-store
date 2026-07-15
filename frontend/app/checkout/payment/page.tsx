"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Banknote, CreditCard, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";
import { useCheckoutStore } from "@/src/hooks/useCheckoutStore";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

type Method = "card" | "upi" | "cod";

const methods: { id: Method; label: string; icon: typeof CreditCard; desc: string }[] = [
  { id: "card", label: "Card", icon: CreditCard, desc: "Visa, Mastercard, RuPay & more" },
  { id: "upi", label: "UPI", icon: Smartphone, desc: "Pay via UPI ID or QR code" },
  { id: "cod", label: "Cash on Delivery", icon: Banknote, desc: "Pay when it arrives" },
];

export default function PaymentPage() {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const shipping = useCheckoutStore((s) => s.shipping);
  const setPaymentMethod = useCheckoutStore((s) => s.setPaymentMethod);
  const storedMethod = useCheckoutStore((s) => s.paymentMethod);

  const [method, setMethod] = useState<Method>(storedMethod ?? "card");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && !shipping) {
      router.replace("/checkout/shipping");
    }
  }, [ready, shipping, router]);

  if (!ready || !shipping) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={28} />
      </div>
    );
  }

  function handleContinue() {
    setSubmitting(true);
    setPaymentMethod(method);
    setTimeout(() => {
      setSubmitting(false);
      router.push("/checkout/review");
    }, 300);
  }

  return (
    <div>
      <CheckoutProgress current={2} />

      <div className="mx-auto max-w-3xl px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Payment method</h1>
          <p className="mt-2 font-body text-sm text-muted">Choose how you&apos;d like to pay.</p>

          <div className="mt-8 rounded-2xl border border-white/5 bg-surface p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {methods.map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border px-4 py-4 text-left transition-colors",
                      active ? "border-accent bg-accent/10" : "border-white/10 bg-bg hover:border-white/20"
                    )}
                  >
                    <Icon size={20} className={active ? "text-accent" : "text-muted"} />
                    <span className={cn("font-body text-sm font-medium", active ? "text-ink" : "text-ink/80")}>
                      {m.label}
                    </span>
                    <span className="font-body text-xs text-muted">{m.desc}</span>
                  </button>
                );
              })}
            </div>

            {(method === "card" || method === "upi") && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease }}
                className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-bg p-4"
              >
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" />
                <p className="font-body text-xs text-muted">
                  You&apos;ll enter your {method === "card" ? "card details" : "UPI ID or scan a QR code"} securely on
                  the next step via Razorpay. NUMEN never sees or stores your payment details.
                </p>
              </motion.div>
            )}

            {method === "cod" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease }}
                className="mt-6 rounded-xl border border-white/10 bg-bg p-4"
              >
                <p className="font-body text-sm text-ink">Pay with cash when your order arrives.</p>
                <p className="mt-1 font-body text-xs text-muted">A small COD handling fee applies at checkout.</p>
              </motion.div>
            )}

            <button
              onClick={handleContinue}
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Saving…" : "Continue to Review"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}