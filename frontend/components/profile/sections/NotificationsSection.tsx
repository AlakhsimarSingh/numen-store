"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { fetchProfile, updateProfile, NotificationPrefs } from "@/src/lib/profile";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const items: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
  { key: "emailDeals", label: "Email deals & promotions", desc: "Discount codes and sale alerts." },
  { key: "smsDeals", label: "SMS deals & promotions", desc: "Text alerts for flash sales." },
  { key: "orderUpdates", label: "Order updates", desc: "Shipping, delivery, and return status." },
  { key: "newDrops", label: "New drop alerts", desc: "Be first to know about new arrivals." },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-white/10")}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-bg transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export default function NotificationsSection() {
  const [notifications, setNotifications] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    fetchProfile().then((data) => setNotifications(data.notifications));
  }, []);

  async function handleToggle(key: keyof NotificationPrefs) {
    if (!notifications) return;
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    await updateProfile({ notifications: next });
  }

  if (!notifications) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className="rounded-2xl border border-white/5 bg-surface p-6"
    >
      <h2 className="font-display text-lg font-bold text-ink">Notification preferences</h2>
      <p className="mt-1 font-body text-xs text-muted">Choose how we reach you — changes save instantly.</p>

      <div className="mt-5 divide-y divide-white/5">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-sm text-ink">{item.label}</p>
              <p className="mt-0.5 font-body text-xs text-muted">{item.desc}</p>
            </div>
            <Toggle checked={notifications[item.key]} onChange={() => handleToggle(item.key)} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}