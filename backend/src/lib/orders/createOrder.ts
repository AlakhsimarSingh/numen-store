import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeTotals, DEFAULT_ORDER_SETTINGS, PAYMENT_METHOD_MAP, serializeOrder } from "@/lib/order/order";

export interface OrderItemInput {
  productId: string;
  qty: number;
  color?: string;
  size?: string;
}

export interface ShippingInput {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
}

export class OrderCreationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Validates stock/pricing fresh against the DB and creates the order +
 * decrements stock atomically. Never trusts client-sent prices or totals —
 * only product IDs, quantities, and a promo code (which is itself re-looked-up).
 */
export async function createOrderFromItems(params: {
  userId: string;
  items: OrderItemInput[];
  shipping: ShippingInput;
  paymentMethod: keyof typeof PAYMENT_METHOD_MAP;
  promoCode?: string;
  paymentStatus: "PENDING" | "PAID";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}) {
  const { userId, items, shipping, paymentMethod, promoCode, paymentStatus, razorpayOrderId, razorpayPaymentId } = params;

  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderCreationError("Cart is empty.", 400);
  }
  if (!shipping?.fullName || !shipping?.addressLine1 || !shipping?.city) {
    throw new OrderCreationError("Missing shipping details.", 400);
  }
  if (!paymentMethod || !(paymentMethod in PAYMENT_METHOD_MAP)) {
    throw new OrderCreationError("Invalid payment method.", 400);
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw new OrderCreationError(`Product ${item.productId} not found.`, 400);
    if (!Number.isInteger(item.qty) || item.qty < 1) throw new OrderCreationError("Invalid quantity.", 400);
    if (product.stock < item.qty) throw new OrderCreationError(`${product.name} is out of stock.`, 409);
  }

  const subtotal = items.reduce((sum, item) => {
    const product = productMap.get(item.productId)!;
    return sum + Number(product.price) * item.qty;
  }, 0);

  let discountPercent = 0;
  const normalizedPromo = promoCode?.trim().toUpperCase();
  if (normalizedPromo) {
    const promo = await prisma.promoCode.findUnique({ where: { code: normalizedPromo } });
    if (promo?.active) discountPercent = promo.percent;
  }

  const settingsRow = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const orderSettings = settingsRow
    ? {
        freeShippingThreshold: Number(settingsRow.freeShippingThreshold),
        shippingFee: Number(settingsRow.shippingFee),
        taxRate: settingsRow.taxRate,
        codFee: Number(settingsRow.codFee),
      }
    : DEFAULT_ORDER_SETTINGS;

  const mappedPaymentMethod = PAYMENT_METHOD_MAP[paymentMethod];
  const { discount, shippingFee, tax, codFee, total } = computeTotals({
    subtotal,
    discountPercent,
    paymentMethod: mappedPaymentMethod,
    settings: orderSettings,
  });

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId,
        subtotal,
        discount,
        shippingFee,
        tax,
        codFee,
        total,
        paymentMethod: mappedPaymentMethod,
        paymentStatus,
        razorpayOrderId,
        razorpayPaymentId,
        shippingSnapshot: shipping as unknown as Prisma.InputJsonValue,
        items: {
          create: items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: product.id,
              name: product.name,
              image: product.image,
              price: product.price,
              qty: item.qty,
              color: item.color,
              size: item.size,
            };
          }),
        },
      },
      include: { items: true },
    });

    for (const item of items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.qty } } });
    }

    return created;
  });

  return serializeOrder(order);
}

/** Returns the computed total (for creating the Razorpay order amount) without persisting anything. */
export async function computeOrderTotal(params: {
  items: OrderItemInput[];
  paymentMethod: keyof typeof PAYMENT_METHOD_MAP;
  promoCode?: string;
}) {
  const { items, paymentMethod, promoCode } = params;

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw new OrderCreationError(`Product ${item.productId} not found.`, 400);
    if (product.stock < item.qty) throw new OrderCreationError(`${product.name} is out of stock.`, 409);
  }

  const subtotal = items.reduce((sum, item) => sum + Number(productMap.get(item.productId)!.price) * item.qty, 0);

  let discountPercent = 0;
  const normalizedPromo = promoCode?.trim().toUpperCase();
  if (normalizedPromo) {
    const promo = await prisma.promoCode.findUnique({ where: { code: normalizedPromo } });
    if (promo?.active) discountPercent = promo.percent;
  }

  const settingsRow = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const orderSettings = settingsRow
    ? {
        freeShippingThreshold: Number(settingsRow.freeShippingThreshold),
        shippingFee: Number(settingsRow.shippingFee),
        taxRate: settingsRow.taxRate,
        codFee: Number(settingsRow.codFee),
      }
    : DEFAULT_ORDER_SETTINGS;

  const { total } = computeTotals({
    subtotal,
    discountPercent,
    paymentMethod: PAYMENT_METHOD_MAP[paymentMethod],
    settings: orderSettings,
  });

  return total;
}