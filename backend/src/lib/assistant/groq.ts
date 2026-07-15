export interface GroqToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: GroqToolCall[];
  name?: string;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
const MAX_RETRIES = 5;

function apiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set.");
  return key;
}

/** Groq's 429 body includes a human-readable "Please try again in 3.63s" hint — use it if present. */
function parseRetryAfterSeconds(errText: string): number | null {
  const match = errText.match(/try again in ([\d.]+)s/i);
  return match ? parseFloat(match[1]) : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function groqRequest(body: Record<string, unknown>): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
      body: JSON.stringify(body),
    });

    if (res.status !== 429) return res;

    if (attempt === MAX_RETRIES) return res; // out of retries — let the caller handle the final failure

    const errText = await res.clone().text().catch(() => "");
    const hinted = parseRetryAfterSeconds(errText);
    const waitMs = hinted !== null ? hinted * 1000 + 300 : Math.min(2 ** attempt * 1000, 8000); // cap exponential fallback at 8s
    await sleep(waitMs);
  }

  // Unreachable, but keeps TypeScript happy about the return type.
  throw new Error("Groq request retry loop exited unexpectedly.");
}

/** Non-streaming call used only to let the model decide whether it needs a tool. */
export async function groqDecideTools(
  messages: GroqMessage[],
  tools: unknown[]
): Promise<GroqMessage & { tool_calls?: GroqToolCall[] }> {
  const res = await groqRequest({ model: MODEL, messages, tools, tool_choice: "auto", temperature: 0.4 });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let errJson: { error?: { code?: string; failed_generation?: string } } | null = null;
    try {
      errJson = JSON.parse(errText);
    } catch {
      // not JSON — fall through to the generic throw below
    }

    // Groq's own guardrail: the model tried to call a tool but the
    // generation didn't parse cleanly. Groq returns a 400 instead of a
    // normal 200, with the raw attempt in failed_generation. Surface that
    // as ordinary assistant content so our pseudo-tool-call parser (in the
    // route handler) can pick it up and actually run the tool.
    if (res.status === 400 && errJson?.error?.code === "tool_use_failed" && errJson.error.failed_generation) {
      return { role: "assistant", content: errJson.error.failed_generation };
    }

    throw new Error(`Groq request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices[0].message;
}

export async function* groqStreamFinal(messages: GroqMessage[]): AsyncGenerator<string> {
  const res = await groqRequest({ model: MODEL, messages, stream: true, temperature: 0.6 });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq stream failed (${res.status}): ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        // skip malformed SSE chunk
      }
    }
  }
}