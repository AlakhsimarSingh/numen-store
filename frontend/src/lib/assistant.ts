export interface AssistantMessage {
  role: "user" | "assistant";
  text: string;
}

export async function streamAssistantReply(
  messages: AssistantMessage[],
  onDelta: (chunk: string) => void
): Promise<void> {
  const res = await fetch("/api/assistant/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "ECHO is having trouble responding right now.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) onDelta(chunk);
  }
}