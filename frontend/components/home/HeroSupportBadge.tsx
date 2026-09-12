"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Phone } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

function buildWhatsAppLink(number: string) {
  const digits = number.replace(/\D/g, "");
  const message = encodeURIComponent("Hi! I have a question about an order.");
  return `https://wa.me/${digits}?text=${message}`;
}

function buildTelLink(number: string) {
  return `tel:${number.replace(/\s+/g, "")}`;
}

/**
 * Corner "stamp" matching the hero's existing visual vocabulary — same
 * mono/uppercase/tracked treatment as the New Season Drop pill and the
 * Spotlight Drop stamp, not a generic card or banner. Collapsed by
 * default; hover (desktop) or tap (touch, since there's no hover there)
 * reveals the actual contact actions.
 */
export default function HeroSupportBadge({ phone, whatsapp }: { phone?: string; whatsapp?: string }) {
  const [open, setOpen] = useState(false);
  if (!phone && !whatsapp) return null;

  return (
    <div
      className="absolute right-4 top-24 z-20 sm:right-6 sm:top-28 md:top-32"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-bg/40 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/80 backdrop-blur-md transition-colors hover:border-accent/40 hover:text-ink"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        Real people online
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease }}
            className="absolute right-0 top-full mt-2 flex flex-col gap-1 rounded-2xl border border-white/10 bg-surface/95 p-2 shadow-2xl backdrop-blur-md"
          >
            {whatsapp && (
              <a
                href={buildWhatsAppLink(whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 font-body text-xs text-ink transition-colors hover:bg-surface2"
              >
                <MessageCircle size={14} className="text-accent" /> WhatsApp us
              </a>
            )}
            {phone && (
              <a
                href={buildTelLink(phone)}
                className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 font-body text-xs text-ink transition-colors hover:bg-surface2"
              >
                <Phone size={14} className="text-accent" /> {phone}
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}