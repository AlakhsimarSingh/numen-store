"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AtSign, Send, PlayCircle, ArrowRight } from "lucide-react";
import { categories } from "@/src/data/categories";

const ease = [0.16, 1, 0.3, 1] as const;

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail("");
  }

  const topCategories = categories.slice(0, 6);

  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <footer className="border-t border-white/5 bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_1fr_1fr_1.3fr]">
          <div>
            <Link href="/" className="font-display text-2xl font-bold text-ink">
              NUMEN<span className="text-accent">.</span>
            </Link>
            <p className="mt-4 max-w-xs font-body text-sm text-muted">
              Premium fits, honest prices. New drops every week across 26 categories.
            </p>
            <div className="mt-6 flex gap-4">
              {[AtSign, Send, PlayCircle].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-muted transition-colors hover:border-accent/50 hover:text-accent"
                >
                  <Icon size={16} />
                </a>
              ))}
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
              {["Shipping", "Returns", "Size Guide", "Track Order", "Contact"].map((item) => (
                <li key={item}>
                  <a href="#" className="font-body text-sm text-ink/80 transition-colors hover:text-accent">
                    {item}
                  </a>
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
          <p className="font-mono text-xs text-muted">© {new Date().getFullYear()} ARC. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/privacy" className="font-mono text-xs text-muted hover:text-ink">Privacy</a>
            <a href="/terms" className="font-mono text-xs text-muted hover:text-ink">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}