import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { STATUS_REVERSE } from "@/lib/order/order";

const LOW_STOCK_MAX = 5;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    revenueAgg,
    ordersCount,
    ordersByStatusRaw,
    pendingReturnsCount,
    productsCount,
    lowStockProductsRaw,
    lowStockCount,
    outOfStockProductsRaw,
    outOfStockCount,
    ratingAgg,
    activePromoCount,
    newCustomersCount,
    pendingCheckoutsCount,
    activeFlashDealsCount,
    recentOrdersRaw,
    recentAuditLogRaw,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalBaseINR: true },
    }),
    prisma.order.count(),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.count({ where: { returnStatus: "REQUESTED" } }),
    prisma.product.count(),
    prisma.product.findMany({
      where: { stock: { gt: 0, lte: LOW_STOCK_MAX } },
      select: { id: true, name: true, slug: true, image: true, stock: true },
      orderBy: { stock: "asc" },
      take: 8,
    }),
    prisma.product.count({ where: { stock: { gt: 0, lte: LOW_STOCK_MAX } } }),
    prisma.product.findMany({
      where: { stock: 0 },
      select: { id: true, name: true, slug: true, image: true, stock: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.product.count({ where: { stock: 0 } }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    prisma.promoCode.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: sevenDaysAgo } } }),
    // NOTE: will read 0 until the Razorpay create-order/verify flow exists —
    // nothing currently writes to PendingCheckout. Left wired so it lights
    // up automatically once that flow is built.
    prisma.pendingCheckout.count(),
    prisma.flashDeal.count({ where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } } }),
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 5,
      select: { id: true, status: true, total: true, placedAt: true, items: { select: { id: true } } },
    }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, action: true, success: true, createdAt: true },
    }),
  ]);

  const ordersByStatus: Record<string, number> = { processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
  for (const row of ordersByStatusRaw) {
    const key = STATUS_REVERSE[row.status as keyof typeof STATUS_REVERSE];
    if (key) ordersByStatus[key] = row._count._all;
  }

  return NextResponse.json({
    revenue: Number(revenueAgg._sum.totalBaseINR ?? 0),
    ordersCount,
    ordersByStatus,
    pendingReturnsCount,
    productsCount,
    lowStock: {
      count: lowStockCount,
      products: lowStockProductsRaw,
    },
    outOfStock: {
      count: outOfStockCount,
      products: outOfStockProductsRaw,
    },
    avgRating: ratingAgg._avg.rating != null ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
    reviewsCount: ratingAgg._count._all,
    activePromoCount,
    newCustomersCount,
    pendingCheckoutsCount,
    activeFlashDealsCount,
    recentOrders: recentOrdersRaw.map((o) => ({
      id: o.id,
      itemsCount: o.items.length,
      status: STATUS_REVERSE[o.status as keyof typeof STATUS_REVERSE],
      total: Number(o.total),
      placedAt: o.placedAt.toISOString(),
    })),
    recentActivity: recentAuditLogRaw.map((a) => ({
      id: a.id,
      email: a.email,
      action: a.action,
      success: a.success,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}