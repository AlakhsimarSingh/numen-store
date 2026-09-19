"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const CONTACT_PHONE_WHATSAPP = "918728882880"; // wa.me — no +, no spaces

/* ---------- Icons ---------- */

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
} as const;

function WhatsAppMark() {
  return (
    <svg {...iconProps}>
      <path d="M6.5 17.5 4 20l2.6-2.4A8 8 0 1 1 9.3 19Z" strokeLinejoin="round" />
      <path
        d="M9 9.7c0 3 2.3 5.3 5.3 5.3.4 0 .8-.3.8-.7v-1.2c0-.3-.2-.6-.5-.7l-1.6-.5c-.3-.1-.6 0-.7.2l-.3.5c-1-.5-1.9-1.4-2.4-2.4l.5-.3c.2-.1.3-.4.2-.7l-.5-1.6c-.1-.3-.4-.5-.7-.5H8.7c-.4 0-.7.4-.7.8Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.15" cy="6.85" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SnapchatMark() {
  return (
    <svg {...iconProps}>
      <path
        d="M12 3.5c-2.6 0-4.3 1.9-4.3 4.4v2.1c-.6.3-1.4.4-2.2.5.2.6.7.9 1.4 1.1-.3.9-.9 1.6-2 2.1.5.5 1.4.7 2.2.8.2.4.4.8.6 1 .9 0 1.5-.3 2.2-.3.7.6 1.4 1.1 2.1 1.1s1.4-.5 2.1-1.1c.7 0 1.3.3 2.2.3.2-.2.4-.6.6-1 .8-.1 1.7-.3 2.2-.8-1.1-.5-1.7-1.2-2-2.1.7-.2 1.2-.5 1.4-1.1-.8-.1-1.6-.2-2.2-.5V7.9c0-2.5-1.7-4.4-4.3-4.4Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TelegramMark() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m7 12.3 4.3 1.6 1.4 3.3 2.3-9.7-9.5 3.6 2.5.9 1 3.1" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Data ---------- */

const directLinks = [
  {
    label: "WhatsApp Channel",
    href: "https://whatsapp.com/channel/0029VaI8Lq8HbFV5feUZgi1K",
    icon: WhatsAppMark,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/nmnnumen?igsh=YzE5bW01ZWl1Z3Br",
    icon: InstagramMark,
  },
  {
    label: "Snapchat",
    href: "https://www.snapchat.com/add/nmnnumen?share_id=2rzQly9QK00&locale=en-IN",
    icon: SnapchatMark,
  },
];

const telegramChannels = [
  { label: "Apparels 👕", href: "https://t.me/numenapparels" },
  { label: "Shoes 👟", href: "https://t.me/numenshoes" },
  { label: "Accessory 😎", href: "https://t.me/numenaccessory" },
  { label: "Watches ⌚️", href: "https://t.me/numenwatches" },
  { label: "Bags 👜", href: "https://t.me/numenbags" },
  { label: "Shades 🕶️", href: "https://t.me/numenshades" },
  { label: "Fragrances 🧴", href: "https://t.me/numenfragrances" },
  { label: "Purse Ladies 👛", href: "https://t.me/numenpurseladies" },
];

/* ---------- Social row ---------- */

const tileBase =
  "flex h-14 w-14 items-center justify-center rounded-2xl border bg-surface2 transition-all sm:h-16 sm:w-16 [&>svg]:h-7 [&>svg]:w-7 sm:[&>svg]:h-8 sm:[&>svg]:w-8";
const tileIdle =
  "border-white/15 text-ink hover:-translate-y-0.5 hover:border-accent hover:text-accent";

function SocialLinks() {
  const [telegramOpen, setTelegramOpen] = useState(false);

  function renderLink(label: string) {
    const link = directLinks.find((l) => l.label === label);
    if (!link) return null;
    const Icon = link.icon;
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={link.label}
        title={link.label}
        className={cn(tileBase, tileIdle)}
      >
        <Icon />
      </a>
    );
  }

  return (
    // The popover is anchored to the centered icon row (not to the Telegram
    // icon at its right end), so it stays centered on screen and can't spill
    // past the right edge.
    <div className="flex flex-col items-center gap-2">
      <p className="font-mono text-sm uppercase tracking-widest text-muted">Social Media</p>
      <div className="relative flex items-center gap-3.5 sm:gap-4">
        {renderLink("Instagram")}

        <button
          onClick={() => setTelegramOpen((v) => !v)}
          aria-label="Telegram channels"
          aria-expanded={telegramOpen}
          className={cn(
            tileBase,
            telegramOpen ? "border-accent bg-accent/10 text-accent" : tileIdle
          )}
        >
          <TelegramMark />
        </button>

        {renderLink("WhatsApp Channel")}
        {renderLink("Snapchat")}

      <AnimatePresence>
        {telegramOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setTelegramOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18, ease }}
              className="absolute bottom-full left-1/2 z-40 mb-3 w-[min(17rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-bg shadow-2xl"
            >
              <p className="border-b border-white/5 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                Telegram
              </p>
              <div className="grid grid-cols-2 gap-px p-1.5">
                {telegramChannels.map((c) => (
                  <a
                    key={c.href}
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setTelegramOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 font-body text-xs text-ink/80 transition-colors hover:bg-surface2 hover:text-accent"
                  >
                    <span className="truncate">{c.label}</span>
                    <ExternalLink size={10} className="ml-2 shrink-0 text-muted" />
                  </a>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- Contact ---------- */

function ContactPrompt() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex flex-col items-center gap-1.5">
        <p className="max-w-sm font-body text-base text-ink/80">
          For LIVE QUALITY REVIEW about ANYTHING.
        </p>
        <p className="max-w-sm font-body text-base text-ink/80">
          Call us on WHATSAPP direct.
        </p>
      </div>
      <a
        href={`https://wa.me/${CONTACT_PHONE_WHATSAPP}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02]"
      >
        <WhatsAppMark />
        Call/Message on WhatsApp
      </a>
    </div>
  );
}

/* ---------- Footer ---------- */

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-white/5 bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-7 px-6 py-10">
        <ContactPrompt />
        <SocialLinks />

        <div className="flex w-full flex-col items-center justify-between gap-4 border-t border-white/5 pt-5 sm:flex-row">
          <p className="font-mono text-xs text-muted">
            © {new Date().getFullYear()} All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="/privacy" className="font-mono text-xs text-muted hover:text-ink">Privacy</a>
            <a href="/terms" className="font-mono text-xs text-muted hover:text-ink">Terms</a>
            <a href="/refund-policy" className="font-mono text-xs text-muted hover:text-ink">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}