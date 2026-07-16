import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getRazorpay, toSmallestUnit } from "@/lib/razorpay/razorpay";
import { computeOrderTotal, OrderCreationError } from "@/lib/orders/createOrder";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to place an order." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const { items, shipping, paymentMethod, promoCode, currency: requestedCurrency } = body;

  if (paymentMethod !== "card" && paymentMethod !== "upi") {
    return NextResponse.json({ error: "Invalid payment method for Razorpay checkout." }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }
  if (!shipping?.fullName || !shipping?.addressLine1) {
    return NextResponse.json({ error: "Missing shipping details." }, { status: 400 });
  }

  try {
    const { total, currency } = await computeOrderTotal({
      items,
      paymentMethod,
      promoCode,
      currency: requestedCurrency,
    });
    const amountInSmallestUnit = toSmallestUnit(total, currency);

    const razorpayOrder = await getRazorpay().orders.create({
      amount: amountInSmallestUnit,
      currency,
      receipt: `numen_${Date.now()}`,
    });

    await prisma.pendingCheckout.create({
      data: {
        userId: user.id,
        razorpayOrderId: razorpayOrder.id,
        itemsSnapshot: items,
        shippingSnapshot: shipping,
        promoCode: promoCode ?? null,
        paymentMethod: paymentMethod === "card" ? "CARD" : "UPI",
        amount: total,
        currency,
      },
    });

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: amountInSmallestUnit,
      currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    if (err instanceof OrderCreationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Razorpay order creation failed:", err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}