import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/products/products";
import type { FlashDeal, Product } from "@prisma/client";

export function serializeFlashDeal(deal: FlashDeal & { product: Product }) {
  return {
    id: deal.id,
    label: deal.label,
    startsAt: deal.startsAt.toISOString(),
    endsAt: deal.endsAt.toISOString(),
    active: deal.active,
    product: serializeProduct(deal.product),
  };
}

/** The deal that should currently be shown on the storefront, if any. */
export async function getCurrentFlashDeal() {
  const now = new Date();
  const deal = await prisma.flashDeal.findFirst({
    where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { startsAt: "desc" },
    include: { product: true },
  });
  return deal ? serializeFlashDeal(deal) : null;
}