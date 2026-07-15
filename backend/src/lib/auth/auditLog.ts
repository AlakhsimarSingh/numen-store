import { prisma } from "@/lib/prisma";

export async function logAdminEvent(params: {
  email: string;
  action: string;
  success?: boolean;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: any;
}) {
  await prisma.adminAuditLog.create({
    data: {
      email: params.email,
      action: params.action,
      success: params.success ?? true,
      ip: params.ip ?? undefined,
      userAgent: params.userAgent ?? undefined,
      metadata: params.metadata ?? undefined,
    },
  });
}