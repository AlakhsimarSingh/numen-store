"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingBag, LayoutGrid, Package, Star, Tag, Settings, Menu, X, ArrowLeft,
  Ruler, Wallet, Zap, LogOut, ShieldCheck, Mail, Shirt,
} from "lucide-react";
import { useAuthStore } from "@/src/hooks/useAuthStore";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: ShoppingBag },
      { label: "Categories", href: "/admin/categories", icon: LayoutGrid },
      { label: "Size Charts", href: "/admin/size-charts", icon: Ruler },
      { label: "Shop the Look", href: "/admin/looks", icon: Shirt },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: Package },
      { label: "Flash Deal", href: "/admin/flash-deal", icon: Zap },
      { label: "Promotions", href: "/admin/promotions", icon: Tag },
      { label: "Payments", href: "/admin/payments", icon: Wallet },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Reviews", href: "/admin/reviews", icon: Star },
      { label: "Contact Inbox", href: "/admin/contact", icon: Mail },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", href: "/admin/settings", icon: Settings }],
  },
];

// Thumb-reachable shortcuts for the mobile bottom bar — the rest live behind "More".
const BOTTOM_TABS: NavItem[] = [
  { label: "Home", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: ShoppingBag },
  { label: "Orders", href: "/admin/orders", icon: Package },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

function isActivePath(pathname: string | null, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname?.startsWith(href) ?? false;
}

function getPageTitle(pathname: string | null): string {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (isActivePath(pathname, item.href)) return item.label;
    }
  }
  return "Admin";
}

function NavLink({
  item,
  active,
  onClick,
  layoutId,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
  layoutId: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3.5 py-3 font-body text-sm transition-colors",
        active ? "text-accent" : "text-muted hover:text-ink"
      )}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-xl bg-accent/10"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon
        size={16}
        strokeWidth={active ? 2 : 1.75}
        className={cn("relative shrink-0 transition-transform duration-200", !active && "group-hover:translate-x-0.5")}
      />
      <span className="relative">{item.label}</span>
    </Link>
  );
}

function AccountFooter({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="space-y-1 border-t border-white/5 p-3">
      {user && (
        <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <ShieldCheck size={14} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-body text-xs text-ink">{user.name ?? "Admin"}</p>
            <p className="truncate font-mono text-[10px] text-muted">{user.email}</p>
          </div>
        </div>
      )}
      <button
        onClick={() => {
          logout();
          onNavigate?.();
        }}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-body text-xs text-muted transition-colors hover:bg-accent2/10 hover:text-accent2"
      >
        <LogOut size={14} /> Log out
      </button>
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-body text-xs text-muted transition-colors hover:bg-surface2 hover:text-ink"
      >
        <ArrowLeft size={14} /> Back to Store
      </Link>
    </div>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer automatically on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const pageTitle = getPageTitle(pathname);
  const isBottomTabActive = BOTTOM_TABS.some((t) => isActivePath(pathname, t.href));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-white/5 lg:bg-surface">
        <div className="flex h-20 shrink-0 items-center px-6">
          <Link href="/admin" className="font-display text-xl font-bold text-ink">
            NUMEN<span className="text-accent">.</span>
            <span className="ml-1.5 font-mono text-[10px] font-normal uppercase tracking-widest text-muted">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3.5 font-mono text-[10px] uppercase tracking-widest text-muted/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActivePath(pathname, item.href)}
                    layoutId="admin-active-desktop"
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <AccountFooter />
      </aside>

      {/* Mobile top bar — shows current section instead of a static logo */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/5 bg-surface/95 px-4 backdrop-blur-sm lg:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 font-display text-base font-bold text-accent">•</span>
          <p className="truncate font-display text-base font-bold text-ink">{pageTitle}</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink/80 transition-colors hover:bg-surface2 active:scale-95"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile bottom tab bar — thumb-reachable shortcuts to the most-used sections */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-white/5 bg-surface/95 backdrop-blur-sm lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {BOTTOM_TABS.map((tab) => {
          const active = isActivePath(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 active:opacity-70"
            >
              {active && (
                <motion.span
                  layoutId="admin-bottom-tab-active"
                  className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon size={19} strokeWidth={active ? 2.1 : 1.75} className={active ? "text-accent" : "text-muted"} />
              <span className={cn("font-mono text-[9px] uppercase tracking-wide", active ? "text-accent" : "text-muted")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 active:opacity-70"
        >
          {!isBottomTabActive && (
            <motion.span
              layoutId="admin-bottom-tab-active"
              className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <Menu size={19} strokeWidth={!isBottomTabActive ? 2.1 : 1.75} className={!isBottomTabActive ? "text-accent" : "text-muted"} />
          <span className={cn("font-mono text-[9px] uppercase tracking-wide", !isBottomTabActive ? "text-accent" : "text-muted")}>
            More
          </span>
        </button>
      </nav>

      {/* Mobile drawer — everything else, reached via "More" or the top-bar menu icon */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-[85%] max-w-72 flex-col border-r border-white/5 bg-surface shadow-2xl"
            >
              <div className="flex h-16 shrink-0 items-center justify-between px-5">
                <span className="font-display text-lg font-bold text-ink">Menu</span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-ink active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 px-3.5 font-mono text-[10px] uppercase tracking-widest text-muted/70">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.href}
                          item={item}
                          active={isActivePath(pathname, item.href)}
                          onClick={() => setOpen(false)}
                          layoutId="admin-active-mobile"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              <AccountFooter onNavigate={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}