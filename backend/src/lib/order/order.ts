import type { Order, OrderItem } from "@prisma/client";

export interface OrderSettings {
  freeShippingThreshold: number;
  shippingFee: number;
  taxRate: number;
  codFee: number;
}

export const DEFAULT_ORDER_SETTINGS: OrderSettings = {
  freeShippingThreshold: 75,
  shippingFee: 6.99,
  taxRate: 0.08,
  codFee: 2,
};

export const PAYMENT_METHOD_MAP = { card: "CARD", upi: "UPI", cod: "COD" } as const;
export const PAYMENT_METHOD_REVERSE = { CARD: "card", UPI: "upi", COD: "cod" } as const;
export const STATUS_REVERSE = {
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export const STATUS_MAP = {
  processing: "PROCESSING",
  shipped: "SHIPPED",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
} as const;

export function computeTotals({
  subtotal,
  discountPercent,
  paymentMethod,
  settings = DEFAULT_ORDER_SETTINGS,
}: {
  subtotal: number;
  discountPercent: number;
  paymentMethod: "CARD" | "UPI" | "COD";
  settings?: OrderSettings;
}) {
  const discount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const discounted = Math.max(0, subtotal - discount);
  const shippingFee = discounted === 0 || discounted >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
  const tax = Math.round(discounted * settings.taxRate * 100) / 100;
  const codFee = paymentMethod === "COD" ? settings.codFee : 0;
  const total = Math.round((discounted + shippingFee + tax + codFee) * 100) / 100;
  return { discount, shippingFee, tax, codFee, total };
}

type OrderWithItems = Order & { items: OrderItem[] };

export function serializeOrder(order: OrderWithItems) {
  return {
    id: order.id,
    items: order.items.map((i) => ({
      productId: i.productId ?? i.id,
      baseId: i.productId ?? i.id,
      name: i.name,
      image: i.image,
      price: Number(i.price),
      qty: i.qty,
      color: i.color ?? undefined,
      size: i.size ?? undefined,
      paymentStatus: order.paymentStatus,
    })),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shippingFee: Number(order.shippingFee),
    tax: Number(order.tax),
    codFee: Number(order.codFee),
    total: Number(order.total),
    shipping: order.shippingSnapshot,
    paymentMethod: PAYMENT_METHOD_REVERSE[order.paymentMethod as keyof typeof PAYMENT_METHOD_REVERSE],
    placedAt: order.placedAt.toISOString(),
    status: STATUS_REVERSE[order.status as keyof typeof STATUS_REVERSE],
    returnRequest: order.returnStatus
      ? {
          reason: order.returnReason ?? "",
          comment: order.returnComment ?? "",
          requestedAt: order.returnRequestedAt?.toISOString() ?? "",
          status: order.returnStatus.toLowerCase(),
        }
      : undefined,
  };
}