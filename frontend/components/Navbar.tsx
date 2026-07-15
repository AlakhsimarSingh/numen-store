"use client";
import { usePathname } from "next/navigation";
import { useSiteSettingsStore } from "@/src/hooks/useSiteSettingsStore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Search, User } from "lucide-react";
import CategoryMegaMenu from "@/components/CategoryMegaMenu";
import CartPreview from "@/components/CartPreview";
import SearchOverlay from "@/components/SearchOverlay";
import { useAuthStore } from "@/src/hooks/useAuthStore";
import { cn } from "@/src/lib/utils";
import { useCurrencyStore } from "@/src/hooks/useCurrencyStore";
import { detectCurrencyFromLocale } from "@/src/lib/currency";
import CurrencySwitcher from "@/components/CurrencySwitcher";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "New Drops", href: "/shop?filter=new" },
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
            <CurrencySwitcher />
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
              aria-label="Menu"
              onClick={() => setOpen(!open)}
              className="text-ink/80 md:hidden"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <motion.nav
          initial={false}
          animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "overflow-hidden border-t md:hidden",
            scrolled ? "border-white/5 bg-bg/80" : "border-white/5 bg-bg/95"
          )}
        >
          <div className="flex flex-col gap-4 px-6 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-body text-sm text-muted hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/categories"
              onClick={() => setOpen(false)}
              className="font-body text-sm text-muted hover:text-ink"
            >
              Categories
            </Link>

            {isLoggedIn ? (
              <div className="mt-2 flex gap-3 border-t border-white/5 pt-4">
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full border border-white/10 py-2 text-center font-body text-sm text-ink"
                >
                  My Account
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="flex-1 rounded-full bg-accent2/10 py-2 text-center font-body text-sm font-semibold text-accent2"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="mt-2 flex gap-3 border-t border-white/5 pt-4">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full border border-white/10 py-2 text-center font-body text-sm text-ink"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full bg-accent py-2 text-center font-body text-sm font-semibold text-bg"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </motion.nav>
      </motion.header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}