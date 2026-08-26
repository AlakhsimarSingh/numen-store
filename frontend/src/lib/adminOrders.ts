import { Order, OrderStatus } from "@/src/lib/orders";

export interface AdminOrderCustomer {
  id: string;
  name?: string;
  email: string;
  phone?: string;
}

export interface AdminOrder extends Order {
  totalBaseINR: number;
  promoCode?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  customer: AdminOrderCustomer;
}

export async function fetchAllOrders(): Promise<AdminOrder[]> {
  const res = await fetch("/api/admin/orders", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load orders.");
  return res.json();
}

export async function updateOrderStatusAdmin(id: string, status: OrderStatus): Promise<AdminOrder> {
  const res = await fetch(`/api/admin/orders/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update order.");
  return data;
}

export async function updateReturnDecision(id: string, decision: "approved" | "rejected"): Promise<AdminOrder> {
  const res = await fetch(`/api/admin/orders/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnDecision: decision }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update return.");
  return data;
}