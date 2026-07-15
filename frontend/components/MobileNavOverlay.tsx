"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, LogOut, User } from "lucide-react";
import { useAuthStore } from "@/src/hooks/useAuthStore";
import CurrencySwitcher from "@/components/CurrencySwitcher";

const ease = [0.16, 1, 0.3, 1] as const;

const links = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "New Drops", href: "/shop?filter=new" },
  { label: "Shop the Look", href: "/shop-the-look" },
  { label: "Categories", href: "/categories" },
  { label: "About", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

export default function MobileNavOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease }}
          className="fixed inset-0 z-[90] flex flex-col bg-bg md:hidden"
        >
          <div className="flex flex-1 flex-col justify-center px-8">
            <nav className="flex flex-col">
              {links.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.45, ease }}
                  className="overflow-hidden border-b border-white/5 py-3.5 first:pt-0 last:border-0"
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="group flex items-center justify-between font-display text-4xl font-bold tracking-tight text-ink transition-colors active:text-accent"
                  >
                    {link.label}
                    <ArrowUpRight
                      size={22}
                      className="text-muted transition-all duration-300 group-active:translate-x-1 group-active:-translate-y-1 group-active:text-accent"
                    />
                  </Link>
                </motion.div>
              ))}
            </nav>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ delay: 0.15, duration: 0.4, ease }}
            className="border-t border-white/5 px-8 pb-8 pt-5"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Currency</span>
              <CurrencySwitcher />
            </div>

            <div className="mt-5 flex gap-3">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 py-3.5 font-body text-sm font-semibold text-ink"
                  >
                    <User size={15} /> My Account
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent2/10 py-3.5 font-body text-sm font-semibold text-accent2"
                  >
                    <LogOut size={15} /> Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="flex flex-1 items-center justify-center rounded-full border border-white/10 py-3.5 font-body text-sm font-semibold text-ink"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={onClose}
                    className="flex flex-1 items-center justify-center rounded-full bg-accent py-3.5 font-body text-sm font-semibold text-bg"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}