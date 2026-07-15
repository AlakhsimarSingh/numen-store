"use client";

import { motion } from "framer-motion";
import { useAuthStore } from "@/src/hooks/useAuthStore";

const ease = [0.16, 1, 0.3, 1] as const;

export default function ProfileHeader() {
  const user = useAuthStore((s) => s.user);
  const initials = (user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="flex items-center gap-5"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 font-display text-lg font-bold text-accent">
        {initials}
      </div>
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl font-bold text-ink sm:text-3xl">{user?.name ?? "Your Account"}</h1>
        <p className="truncate font-body text-sm text-muted">{user?.email}</p>
      </div>
    </motion.div>
  );
}