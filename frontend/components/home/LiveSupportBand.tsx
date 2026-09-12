"use client";

import { MessageCircle, Phone, User } from "lucide-react";
import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

function buildWhatsAppLink(number: string) {
  const digits = number.replace(/\D/g, "");
  const message = encodeURIComponent("Hi! I have a question about an order.");
  return `https://wa.me/${digits}?text=${message}`;
}

function buildTelLink(number: string) {
  return `tel:${number.replace(/\s+/g, "")}`;
}

export default function LiveSupportBand({
  phone,
  whatsapp,
}: {
  phone?: string;
  whatsapp?: string;
}) {
  // No numbers configured — don't render a band with dead-end buttons.
  if (!phone && !whatsapp) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease }}
        className="flex flex-col items-center gap-6 rounded-3xl border border-accent/20 bg-surface px-6 py-8 shadow-[0_0_40px_-12px_rgba(var(--color-accent-rgb,0,0,0),0.25)] sm:flex-row sm:justify-between sm:px-10"
      >
        <div className="flex items-center gap-4">
          {/* Overlapping "team" avatars — deliberately plain/human-shaped
              icons rather than photos, since we don't have real staff
              photos wired in; swap the User icons for actual headshots
              later if you want to go further. */}
          <div className="flex -space-x-3">
            {["bg-accent/25", "bg-accent2/25", "bg-white/10"].map((bg, i) => (
              <div
                key={i}
                className={`flex h-11 w-11 items-center justify-center rounded-full ring-2 ring-surface ${bg}`}
              >
                <User size={18} className="text-ink/70" />
              </div>
            ))}
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-2 ring-surface">
              <User size={18} className="text-ink/70" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-surface bg-accent" />
              </span>
            </div>
          </div>

          <div>
            <p className="font-body text-sm font-semibold text-ink">Real people, ready to help</p>
            <p className="font-body text-xs text-muted">No bots, no hold music — just message or call us directly.</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
          {whatsapp && (
            <a
              href={buildWhatsAppLink(whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02]"
            >
              <MessageCircle size={16} /> WhatsApp Us
            </a>
          )}
          {phone && (
            <a
              href={buildTelLink(phone)}
              className="flex items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-2.5 font-body text-sm font-semibold text-ink transition-colors hover:border-accent/50 hover:text-accent"
            >
              <Phone size={16} /> {phone}
            </a>
          )}
        </div>
      </motion.div>
    </section>
  );
}