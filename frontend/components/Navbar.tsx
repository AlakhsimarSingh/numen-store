"use client";
import { usePathname } from "next/navigation";
import { useSiteSettingsStore } from "@/src/hooks/useSiteSettingsStore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, User } from "lucide-react";
import CategoryMegaMenu from "@/components/CategoryMegaMenu";
import CartPreview from "@/components/CartPreview";
import SearchOverlay from "@/components/SearchOverlay";
import MobileNavOverlay from "@/components/MobileNavOverlay";
import { useAuthStore } from "@/src/hooks/useAuthStore";
import { cn } from "@/src/lib/utils";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { detectCurrencyFromLocale } from "@/src/lib/currency";
import CurrencySwitcher from "@/components/CurrencySwitcher";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "New Drops", href: "/shop?filter=new" },
  { label: "Shop the Look", href: "/shop-the-look" },
  { label: "About", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);
  const pathname = usePathname();
  const siteName = useSiteSettingsStore((s) => s.siteName);
  const userSelected = useCurrencyStore((s) => s.userSelected);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const loadRates = useCurrencyStore((s) => s.loadRates);
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    loadRates();
  }, [loadRates]);
  useEffect(() => {
    if (userSelected) return;
    const detected = detectCurrencyFromLocale(navigator.language);
    setCurrency(detected, false);
  }, [userSelected, setCurrency]);
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 h-20 border-b transition-all duration-500",
          scrolled
            ? "border-white/5 bg-bg/80 backdrop-blur-md"
            : "border-transparent bg-transparent backdrop-blur-0"
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight text-ink">
            {siteName.replace(".", "")}<span className="text-accent">.</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={link.href}
                  className="group relative font-body text-sm text-muted transition-colors hover:text-ink"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + navLinks.length * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <CategoryMegaMenu />
            </motion.div>
          </nav>

          <div className="flex items-center gap-5">
            <div className="hidden md:block">
              <CurrencySwitcher />
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="text-ink/80 transition-colors hover:text-accent"
            >
              <Search size={20} />
            </button>

            {isLoggedIn ? (
              <div
                className="relative hidden sm:block"
                onMouseEnter={() => setAccountMenuOpen(true)}
                onMouseLeave={() => setAccountMenuOpen(false)}
              >
                <button
                  aria-label="Account"
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className="text-ink/80 transition-colors hover:text-accent"
                >
                  <User size={20} />
                </button>
                <AnimatePresence>
                  {accountMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-lg"
                    >
                      <Link
                        href="/account"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-4 py-2.5 font-body text-sm text-ink hover:bg-surface2"
                      >
                        My Account
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setAccountMenuOpen(false);
                        }}
                        className="block w-full px-4 py-2.5 text-left font-body text-sm text-accent2 hover:bg-surface2"
                      >
                        Log out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                aria-label="Account"
                className="hidden text-ink/80 transition-colors hover:text-accent sm:block"
              >
                <User size={20} />
              </Link>
            )}

            <CartPreview />

            <button
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
              className="relative flex h-6 w-6 flex-col items-center justify-center gap-[5px] md:hidden"
            >
              <motion.span
                animate={open ? { rotate: 45, y: 6.5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="h-[1.5px] w-5 bg-ink/80"
              />
              <motion.span
                animate={open ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="h-[1.5px] w-5 bg-ink/80"
              />
              <motion.span
                animate={open ? { rotate: -45, y: -6.5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="h-[1.5px] w-5 bg-ink/80"
              />
            </button>
          </div>
        </div>
      </motion.header>

      <MobileNavOverlay open={open} onClose={() => setOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}