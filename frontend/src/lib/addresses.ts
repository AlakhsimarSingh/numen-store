export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
}

export async function fetchAddresses(): Promise<Address[]> {
  const res = await fetch("/api/addresses", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load addresses.");
  return res.json();
}

export async function createAddress(data: Omit<Address, "id" | "isDefault"> & { isDefault?: boolean }): Promise<Address> {
  const res = await fetch("/api/addresses", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error ?? "Failed to save address.");
  return result;
}

export async function setDefaultAddress(id: string): Promise<Address> {
  const res = await fetch(`/api/addresses/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ setDefault: true }),
  });
  if (!res.ok) throw new Error("Failed to set default address.");
  return res.json();
}

export async function deleteAddress(id: string): Promise<void> {
  const res = await fetch(`/api/addresses/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error("Failed to delete address.");
}