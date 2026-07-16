export type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";
export type ReturnRequestStatus = "requested" | "approved" | "rejected";
export type PaymentMethodId = "card" | "upi" | "cod";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  productId: string;
  baseId: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  color?: string;
  size?: string;
}

export interface ShippingSnapshot {
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

export interface ReturnRequest {
  reason: string;
  comment: string;
  requestedAt: string;
  status: ReturnRequestStatus;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  codFee: number;
  total: number;
  currency: string;
  paymentStatus: PaymentStatus;
  shipping: ShippingSnapshot;
  paymentMethod: PaymentMethodId;
  status: OrderStatus;
  placedAt: string;
  returnRequest?: ReturnRequest;
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch("/api/orders", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load orders.");
  return res.json();
}

export async function fetchOrder(id: string): Promise<Order> {
  const res = await fetch(`/api/orders/${id}`, { credentials: "include" });
  if (!res.ok) {
    if (res.status === 404) throw new Error("NOT_FOUND");
    throw new Error("Failed to load order.");
  }
  return res.json();
}

export async function requestOrderReturn(id: string, reason: string, comment: string): Promise<Order> {
  const res = await fetch(`/api/orders/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, comment }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to submit return request.");
  return data;
}