export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  reply?: string;
  repliedAt?: string;
  repliedBy?: string;
  userId?: string;
  createdAt: string;
}

export async function submitContactMessage(payload: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<void> {
  const res = await fetch("/api/contact", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to send message.");
}

export async function fetchContactMessages(): Promise<ContactMessage[]> {
  const res = await fetch("/api/admin/contact", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load messages.");
  return res.json();
}

export async function replyToContactMessage(id: string, reply: string): Promise<ContactMessage> {
  const res = await fetch(`/api/admin/contact/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reply }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to send reply.");
  return data;
}

export async function updateContactStatus(id: string, status: ContactMessage["status"]): Promise<ContactMessage> {
  const res = await fetch(`/api/admin/contact/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update status.");
  return data;
}