export interface AdminEntry {
  email: string;
  addedAt: string;
  addedBy: string | null;
  note: string | null;
  hasAccount: boolean;
  name: string | null;
  userId: string | null;
  roleMismatch: boolean;
}

export async function fetchAdmins(): Promise<AdminEntry[]> {
  const res = await fetch("/api/admin/admins", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load admins.");
  return res.json();
}

export async function addAdmin(email: string, note?: string): Promise<AdminEntry> {
  const res = await fetch("/api/admin/admins", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to add admin.");
  return data;
}

export async function revokeAdmin(email: string): Promise<void> {
  const res = await fetch(`/api/admin/admins/${encodeURIComponent(email)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to revoke admin.");
  }
}