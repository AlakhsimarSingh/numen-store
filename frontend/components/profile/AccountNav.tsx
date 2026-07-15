"use client";

import { Bell, CreditCard, Heart, MapPin, Package, User } from "lucide-react";
import { cn } from "@/src/lib/utils";

export type AccountTab = "profile" | "addresses" | "payment" | "orders" | "wishlist" | "notifications";

const tabs: { id: AccountTab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "orders", label: "Orders", icon: Package },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function AccountNav({
  active,
  onChange,
}: {
  active: AccountTab;
  onChange: (tab: AccountTab) => void;
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:block">
        <div className="sticky top-24 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left font-body text-sm transition-colors",
                  isActive ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface hover:text-ink"
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile horizontal tabs */}
      <div className="sticky top-20 z-30 -mx-6 mb-2 border-b border-white/5 bg-bg/95 px-6 py-3 backdrop-blur-md lg:hidden">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 font-body text-xs transition-colors",
                  isActive
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-white/10 text-muted hover:text-ink"
                )}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}