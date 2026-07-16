import { prisma } from "@/lib/prisma";
import type { AdminAllowlist, User } from "@prisma/client";

export function serializeAdmin(entry: AdminAllowlist & { user: User | null }) {
  return {
    email: entry.email,
    addedAt: entry.addedAt.toISOString(),
    addedBy: entry.addedBy,
    note: entry.note,
    hasAccount: !!entry.user,
    name: entry.user?.name ?? null,
    userId: entry.user?.id ?? null,
    roleMismatch: !!entry.user && entry.user.role !== "ADMIN", // flags the exact bug class we hit earlier
  };
}