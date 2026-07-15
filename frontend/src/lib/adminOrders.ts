import { Order, OrderStatus } from "@/src/lib/orders";

export async function fetchAllOrders(): Promise<Order[]> {
  const res = await fetch("/api/admin/orders", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load orders.");
  return res.json();
}

export async function updateOrderStatusAdmin(id: string, status: OrderStatus): Promise<Order> {
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

export async function updateReturnDecision(id: string, decision: "approved" | "rejected"): Promise<Order> {
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