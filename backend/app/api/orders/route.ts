import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { serializeOrder } from "@/lib/order/order";
import { createOrderFromItems, OrderCreationError } from "@/lib/orders/createOrder";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to place an order." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const { items, shipping, paymentMethod, promoCode } = body;

  if (paymentMethod !== "cod") {
    return NextResponse.json(
      { error: "Card and UPI payments must go through the Razorpay checkout flow." },
      { status: 400 }
    );
  }

  try {
    const order = await createOrderFromItems({
      userId: user.id,
      items,
      shipping,
      paymentMethod: "cod",
      promoCode,
      paymentStatus: "PENDING", // COD is only "paid" once collected on delivery
    });
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    if (err instanceof OrderCreationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Order creation failed:", err);
    return NextResponse.json({ error: "Could not place order. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { placedAt: "desc" },
  });

  return NextResponse.json(orders.map(serializeOrder));
}