export interface SavedPaymentMethod {
  id: string;
  type: "card" | "upi";
  label: string;
  isDefault: boolean;
}

export async function fetchPaymentMethods(): Promise<SavedPaymentMethod[]> {
  const res = await fetch("/api/payment-methods", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load payment methods.");
  return res.json();
}

export async function createPaymentMethod(data: { type: "card" | "upi"; label: string }): Promise<SavedPaymentMethod> {
  const res = await fetch("/api/payment-methods", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error ?? "Failed to save payment method.");
  return result;
}

export async function setDefaultPaymentMethod(id: string): Promise<SavedPaymentMethod> {
  const res = await fetch(`/api/payment-methods/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ setDefault: true }),
  });
  if (!res.ok) throw new Error("Failed to set default.");
  return res.json();
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const res = await fetch(`/api/payment-methods/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error("Failed to delete payment method.");
}