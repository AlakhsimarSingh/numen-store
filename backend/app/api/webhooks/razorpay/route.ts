import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay/razorpay";
import { createOrderFromItems, OrderCreationError } from "@/lib/orders/createOrder";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const razorpayOrderId = payment.order_id;
    const razorpayPaymentId = payment.id;

    const alreadyExists = await prisma.order.findUnique({ where: { razorpayPaymentId } });
    if (alreadyExists) {
      return NextResponse.json({ ok: true }); // already handled via /verify — idempotent no-op
    }

    const pending = await prisma.pendingCheckout.findUnique({ where: { razorpayOrderId } });
    if (!pending) {
      // Nothing we can reconstruct from — log for manual review.
      console.error("Webhook payment.captured with no matching PendingCheckout:", razorpayOrderId);
      return NextResponse.json({ ok: true });
    }

    try {
      await createOrderFromItems({
        userId: pending.userId,
        items: pending.itemsSnapshot as never,
        shipping: pending.shippingSnapshot as never,
        paymentMethod: pending.paymentMethod === "CARD" ? "card" : "upi",
        promoCode: pending.promoCode ?? undefined,
        paymentStatus: "PAID",
        razorpayOrderId,
        razorpayPaymentId,
      });
      await prisma.pendingCheckout.delete({ where: { id: pending.id } }).catch(() => {});
    } catch (err) {
      console.error("Webhook order creation failed:", err);
      // Same reconciliation concern as /verify — money moved, order didn't.
    }
  }

  if (event.event === "payment.failed") {
    const razorpayOrderId = event.payload.payment.entity.order_id;
    await prisma.pendingCheckout.deleteMany({ where: { razorpayOrderId } }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}