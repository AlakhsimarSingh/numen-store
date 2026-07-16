import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeStock } from "@/lib/products/products";
import { getDisplayPriceServer } from "@/lib/currency/currency";
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

interface VariantStockEntry {
  color: string;
  size: string;
  stock: number;
}

interface LockedProductRow {
  id: string;
  name: string;
  stock: number;
  colors: unknown;
  sizes: string[] | null;
  variantStock: unknown;
}

export class OrderCreationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Fetches live CurrencyRate rows and resolves the requested currency against them, falling back to INR if unknown. */
async function resolveCurrency(requested: string | undefined) {
  const rateRows = await prisma.currencyRate.findMany();
  const rates: Record<string, number> = { INR: 1 };
  rateRows.forEach((r) => {
    rates[r.code] = r.rate;
  });
  const code = (requested ?? "INR").trim().toUpperCase();
  const currency = code === "INR" || rates[code] ? code : "INR";
  return { currency, rates };
}

/**
 * Validates stock/pricing fresh against the DB and creates the order +
 * decrements stock atomically. Never trusts client-sent prices, totals, or
 * currency rates — only product IDs, quantities, a promo code, and a
 * requested currency (all re-resolved server-side). Stock is decremented
 * per-variant under a row lock so concurrent checkouts can't oversell a
 * specific color/size even when the aggregate `Product.stock` looks fine.
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
  /** Currency the customer selected at checkout. Defaults to INR if omitted or unrecognized. */
  currency?: string;
}) {
  const {
    userId,
    items,
    shipping,
    paymentMethod,
    promoCode,
    paymentStatus,
    razorpayOrderId,
    razorpayPaymentId,
    currency: requestedCurrency,
  } = params;

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
    // NOTE: no stock check here — `product.stock` is an aggregate across
    // variants and can look fine even when the specific color/size the
    // customer picked is sold out. The real, authoritative check happens
    // per-variant under a row lock inside the transaction below.
  }

  const { currency, rates } = await resolveCurrency(requestedCurrency);

  // Two independent, fully server-derived subtotals: one in the currency
  // actually charged, one always in INR for cross-currency revenue
  // aggregation (Order.totalBaseINR). Never derived from each other.
  let subtotalCharged = 0;
  let subtotalBaseINR = 0;
  const resolvedItemPrices = new Map<string, number>(); // productId -> price in charged currency

  for (const item of items) {
    const product = productMap.get(item.productId)!;
    const display = getDisplayPriceServer(
      {
        price: Number(product.price),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        regionalPrices: product.regionalPrices,
      },
      currency,
      rates
    );
    resolvedItemPrices.set(item.productId, display.price);
    subtotalCharged += display.price * item.qty;
    subtotalBaseINR += Number(product.price) * item.qty;
  }

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

  const chargedTotals = computeTotals({
    subtotal: subtotalCharged,
    discountPercent,
    paymentMethod: mappedPaymentMethod,
    settings: orderSettings,
    currency,
    rates,
  });
  const inrTotals = computeTotals({
    subtotal: subtotalBaseINR,
    discountPercent,
    paymentMethod: mappedPaymentMethod,
    settings: orderSettings,
    currency: "INR",
    rates,
  });

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId,
        subtotal: subtotalCharged,
        discount: chargedTotals.discount,
        shippingFee: chargedTotals.shippingFee,
        tax: chargedTotals.tax,
        codFee: chargedTotals.codFee,
        total: chargedTotals.total,
        totalBaseINR: inrTotals.total,
        currency,
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
              price: resolvedItemPrices.get(item.productId)!, // price in the CHARGED currency, not raw INR
              qty: item.qty,
              color: item.color,
              size: item.size,
            };
          }),
        },
      },
      include: { items: true },
    });

    // Row-locked, per-variant decrement — applied sequentially per line
    // item so concurrent checkouts for the same product can't both pass a
    // stale stock check and both decrement.
    for (const item of items) {
      const rows = await tx.$queryRaw<LockedProductRow[]>(
        Prisma.sql`SELECT * FROM "Product" WHERE id = ${item.productId} FOR UPDATE`
      );
      const locked = rows[0];
      if (!locked) throw new OrderCreationError("One of the items in your cart no longer exists.", 409);

      const colors = Array.isArray(locked.colors) ? (locked.colors as { name: string }[]) : [];
      const sizes = Array.isArray(locked.sizes) ? locked.sizes : [];
      const hasVariants = colors.length > 0 || sizes.length > 0;

      if (hasVariants) {
        const variantStock: VariantStockEntry[] = Array.isArray(locked.variantStock)
          ? (locked.variantStock as VariantStockEntry[])
          : [];
        const colorKey = item.color ?? "Default";
        const sizeKey = item.size ?? "One Size";
        const idx = variantStock.findIndex((v) => v.color === colorKey && v.size === sizeKey);

        if (idx === -1 || variantStock[idx].stock < item.qty) {
          throw new OrderCreationError(
            `${locked.name} (${sizeKey}${colorKey !== "Default" ? `, ${colorKey}` : ""}) is out of stock.`,
            409
          );
        }

        const updatedVariantStock = variantStock.map((v, i) =>
          i === idx ? { ...v, stock: v.stock - item.qty } : v
        );
        const newAggregateStock = computeStock({
          stock: locked.stock,
          colors,
          sizes,
          variantStock: updatedVariantStock,
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: newAggregateStock,
            variantStock: updatedVariantStock as unknown as Prisma.InputJsonValue,
          },
        });
      } else {
        if (locked.stock < item.qty) {
          throw new OrderCreationError(`${locked.name} is out of stock.`, 409);
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }
    }

    return created;
  });

  return serializeOrder(order);
}

/**
 * Returns the computed total (for creating the Razorpay order amount)
 * without persisting anything. Now currency-aware — Razorpay needs the
 * amount expressed in the currency actually being charged, since it
 * charges in whatever currency + smallest-unit amount you hand it.
 */
export async function computeOrderTotal(params: {
  items: OrderItemInput[];
  paymentMethod: keyof typeof PAYMENT_METHOD_MAP;
  promoCode?: string;
  currency?: string;
}) {
  const { items, paymentMethod, promoCode, currency: requestedCurrency } = params;

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw new OrderCreationError(`Product ${item.productId} not found.`, 400);
    if (product.stock < item.qty) throw new OrderCreationError(`${product.name} is out of stock.`, 409);
  }

  const { currency, rates } = await resolveCurrency(requestedCurrency);

  const subtotal = items.reduce((sum, item) => {
    const product = productMap.get(item.productId)!;
    const display = getDisplayPriceServer(
      {
        price: Number(product.price),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        regionalPrices: product.regionalPrices,
      },
      currency,
      rates
    );
    return sum + display.price * item.qty;
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

  const { total } = computeTotals({
    subtotal,
    discountPercent,
    paymentMethod: PAYMENT_METHOD_MAP[paymentMethod],
    settings: orderSettings,
    currency,
    rates,
  });

  return { total, currency };
}