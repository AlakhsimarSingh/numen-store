"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { fetchCategories, Category } from "@/src/lib/categories";
import { useSiteSettingsStore } from "@/src/hooks/useSiteSettingsStore";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const helpLinks = [
  { label: "Track Order", href: "/account/orders" },
  { label: "FAQs", href: "/faq" },
  { label: "Contact Us", href: "/contact" },
];

function InstagramMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.15" cy="6.85" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsAppMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6.5 17.5 4 20l2.6-2.4A8 8 0 1 1 9.3 19Z" />
      <path d="M9 9.7c0 3 2.3 5.3 5.3 5.3.4 0 .8-.3.8-.7v-1.2c0-.3-.2-.6-.5-.7l-1.6-.5c-.3-.1-.6 0-.7.2l-.3.5c-1-.5-1.9-1.4-2.4-2.4l.5-.3c.2-.1.3-.4.2-.7l-.5-1.6c-.1-.3-.4-.5-.7-.5H8.7c-.4 0-.7.4-.7.8Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TelegramMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="m7 12.3 4.3 1.6 1.4 3.3 2.3-9.7-9.5 3.6 2.5.9 1 3.1" strokeLinejoin="round" />
    </svg>
  );
}

interface SocialLink {
  label: string;
  href: string;
}

interface SocialGroup {
  key: string;
  platform: string;
  icon: () => React.ReactElement;
  links: SocialLink[];
}

const socialGroups: SocialGroup[] = [
  {
    key: "instagram",
    platform: "Instagram",
    icon: InstagramMark,
    links: [
      { label: "Apparels", href: "https://www.instagram.com/numen.apparels?igsh=M3lyMjZ3aDhrN204" },
      { label: "Shoes", href: "https://www.instagram.com/numen.shoes?igsh=b2g0eDIycDN4OG9q" },
      { label: "Accessories", href: "https://www.instagram.com/numen.accessory?igsh=OGE4dWs3bjNtMmdw" },
      { label: "Bags", href: "https://www.instagram.com/numen.bags?igsh=MWRnZ2llejJzcmtvag==" },
    ],
  },
  {
    key: "whatsapp",
    platform: "WhatsApp",
    icon: WhatsAppMark,
    links: [
      { label: "Updates Channel", href: "https://whatsapp.com/channel/0029VaI8Lq8HbFV5feUZgi1K" },
      { label: "NUMEN Family Community ❤️", href: "https://chat.whatsapp.com/FNdIjeTH4OQBU3XR6FuhC5" },
    ],
  },
  {
    key: "telegram",
    platform: "Telegram",
    icon: TelegramMark,
    links: [
      { label: "Apparels 👕", href: "https://t.me/numenapparels" },
      { label: "Shoes 👟", href: "https://t.me/numenshoes" },
      { label: "Accessory 😎", href: "https://t.me/numenaccessory" },
      { label: "Watches ⌚️", href: "https://t.me/numenwatches" },
      { label: "Bags 👜", href: "https://t.me/numenbags" },
    ],
  },
];

function SocialLinks() {
  const [open, setOpen] = useState<string | null>(null);
  const lastIndex = socialGroups.length - 1;

  return (
    <div className="flex gap-3">
      {socialGroups.map((group, i) => {
        const Icon = group.icon;
        const isOpen = open === group.key;

        // First icon sits near the left viewport edge — anchor its popover
        // left instead of centered, so it expands rightward into available
        // space rather than overflowing off-screen. Last icon mirrors this
        // on the right. Only a middle icon can safely stay centered.
        const isFirst = i === 0;
        const isLast = i === lastIndex;
        const menuAnchorClass = isFirst ? "left-0" : isLast ? "right-0" : "left-1/2 -translate-x-1/2";
        const arrowAnchorClass = isFirst ? "left-4" : isLast ? "right-4" : "left-1/2 -translate-x-1/2";

        return (
          <div key={group.key} className="relative">
            <button
              onClick={() => setOpen(isOpen ? null : group.key)}
              aria-label={group.platform}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
                isOpen ? "border-accent/60 text-accent" : "border-white/10 text-muted hover:border-accent/50 hover:text-accent"
              )}
            >
              <Icon />
            </button>

            <AnimatePresence>
              {isOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setOpen(null)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.18, ease }}
                    className={cn(
                      "absolute bottom-full z-40 mb-3 w-52 overflow-hidden rounded-2xl border border-white/10 bg-bg shadow-2xl",
                      menuAnchorClass
                    )}
                  >
                    <p className="border-b border-white/5 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                      {group.platform}
                    </p>
                    <div className="py-1">
                      {group.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between px-4 py-2.5 font-body text-xs text-ink/80 transition-colors hover:bg-surface2 hover:text-accent"
                        >
                          {link.label}
                          <ExternalLink size={11} className="shrink-0 text-muted" />
                        </a>
                      ))}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-1.5 h-3 w-3 rotate-45 border-b border-r border-white/10 bg-bg",
                        isFirst || isLast ? arrowAnchorClass : "left-1/2 -translate-x-1/2"
                      )}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const siteName = useSiteSettingsStore((s) => s.siteName);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {
        // Silently fail — footer just won't show the Shop links if this errors.
      });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail("");
  }

  const topCategories = categories.slice(0, 6);

  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  const displayName = siteName.replace(".", "");

  return (
    <footer className="border-t border-white/5 bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_1fr_1fr_1.3fr]">
          <div>
            <Link href="/" className="font-display text-2xl font-bold text-ink">
              {displayName}<span className="text-accent">.</span>
            </Link>
            <p className="mt-4 max-w-xs font-body text-sm text-muted">
              Premium fits, honest prices. New drops every week across 26 categories.
            </p>
            <div className="mt-6">
              <SocialLinks />
            </div>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-muted">Shop</h4>
            <ul className="mt-4 space-y-3">
              {topCategories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/shop/${cat.slug}`}
                    className="font-body text-sm text-ink/80 transition-colors hover:text-accent"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/shop" className="font-body text-sm text-accent">
                  View all →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-muted">Help</h4>
            <ul className="mt-4 space-y-3">
              {helpLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="font-body text-sm text-ink/80 transition-colors hover:text-accent">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-muted">Stay in the loop</h4>
            <p className="mt-4 font-body text-sm text-muted">
              Drop your email, get first access to new arrivals.
            </p>
            <AnimatePresence mode="wait">
              {subscribed ? (
                <motion.p
                  key="done"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease }}
                  className="mt-4 font-mono text-xs text-accent"
                >
                  You&apos;re on the list.
                </motion.p>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-bg p-1.5 pl-4"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-bg transition-transform hover:scale-105"
                  >
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row">
          <p className="font-mono text-xs text-muted">© {new Date().getFullYear()} {displayName}. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/privacy" className="font-mono text-xs text-muted hover:text-ink">Privacy</a>
            <a href="/terms" className="font-mono text-xs text-muted hover:text-ink">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}