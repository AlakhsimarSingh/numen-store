import { prisma } from "@/lib/prisma";

interface RateLimitConfig {
  identifier: string;
  scope: string;
  maxAttempts: number;
  windowMinutes: number;
}

export async function checkRateLimit({ identifier, scope, maxAttempts, windowMinutes }: RateLimitConfig): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const count = await prisma.loginAttempt.count({
    where: { identifier, scope, createdAt: { gte: windowStart } },
  });

  if (count >= maxAttempts) {
    const oldest = await prisma.loginAttempt.findFirst({
      where: { identifier, scope, createdAt: { gte: windowStart } },
      orderBy: { createdAt: "asc" },
    });
    const retryAfterSeconds = oldest
      ? Math.ceil((oldest.createdAt.getTime() + windowMinutes * 60 * 1000 - Date.now()) / 1000)
      : windowMinutes * 60;
    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }

  return { allowed: true };
}

export async function recordAttempt(identifier: string, scope: string) {
  await prisma.loginAttempt.create({ data: { identifier, scope } });
}

// Housekeeping — call opportunistically (e.g. low-traffic cron) to keep the table small.
export async function pruneOldAttempts(olderThanHours = 24) {
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - olderThanHours * 60 * 60 * 1000) } },
  });
}