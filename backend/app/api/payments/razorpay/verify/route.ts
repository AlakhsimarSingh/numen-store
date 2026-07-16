import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyPaymentSignature } from "@/lib/razorpay/razorpay";
import { createOrderFromItems, OrderCreationError } from "@/lib/orders/createOrder";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment verification data." }, { status: 400 });
  }

  const valid = verifyPaymentSignature({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
  });

  if (!valid) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  const pending = await prisma.pendingCheckout.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
  if (!pending) {
    return NextResponse.json({ error: "Checkout session not found or already completed." }, { status: 404 });
  }
  if (pending.userId !== user.id) {
    return NextResponse.json({ error: "This checkout session doesn't belong to you." }, { status: 403 });
  }

  // Order might already exist if the webhook beat this request to it — treat that as success.
  const existing = await prisma.order.findUnique({ where: { razorpayPaymentId: razorpay_payment_id } });
  if (existing) {
    await prisma.pendingCheckout.delete({ where: { id: pending.id } }).catch(() => {});
    const { serializeOrder } = await import("@/lib/order/order");
    const full = await prisma.order.findUnique({ where: { id: existing.id }, include: { items: true } });
    return NextResponse.json(serializeOrder(full!));
  }

  try {
    const order = await createOrderFromItems({
      userId: pending.userId,
      items: pending.itemsSnapshot as never,
      shipping: pending.shippingSnapshot as never,
      paymentMethod: pending.paymentMethod === "CARD" ? "card" : "upi",
      promoCode: pending.promoCode ?? undefined,
      paymentStatus: "PAID",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      currency: pending.currency,
    });

    await prisma.pendingCheckout.delete({ where: { id: pending.id } }).catch(() => {});

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    if (err instanceof OrderCreationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Order creation after payment failed:", err);
    // Payment succeeded but order creation failed (e.g. stock ran out between
    // create-order and now) — this needs manual reconciliation since money
    // has actually moved. Don't silently lose this.
    return NextResponse.json(
      { error: "Payment succeeded but we couldn't complete your order. Contact support with this reference: " + razorpay_payment_id },
      { status: 500 }
    );
  }
}