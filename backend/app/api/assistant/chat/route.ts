import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";
import {
  searchCatalog,
  getStorePolicies,
  serializeCustomerProfile,
  getCustomerOrders,
} from "@/lib/assistant/context";
import { webSearch } from "@/lib/assistant/tavily";
import { groqDecideTools, groqStreamFinal, type GroqMessage, type GroqToolCall } from "@/lib/assistant/groq";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search the NUMEN product catalog by keyword — product name, category, color, or style. Use this whenever the customer asks about specific products, categories, prices, or what's available. Don't guess at what we stock; look it up.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "e.g. 'black jacket' or 'cargo pants'" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the live web for general fashion trends or styling knowledge outside our own catalog. Not for NUMEN's own products — use search_products for that.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
];

async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (name === "search_products") return JSON.stringify(await searchCatalog(String(args.query ?? "")));
  if (name === "web_search") return JSON.stringify(await webSearch(String(args.query ?? "")));
  return JSON.stringify({ error: "Unknown tool" });
}

/**
 * Some Llama models on Groq occasionally emit tool calls as literal text
 * (`<function=name{...}</function>`) instead of using the structured
 * tool_calls field, especially with tool_choice: "auto". This catches that
 * pattern so it never leaks into what the user sees.
 */
function parsePseudoToolCalls(content: string): { name: string; args: Record<string, unknown> }[] {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const regex = /<function=([a-zA-Z0-9_]+)>?\s*(\{[\s\S]*?\})\s*(?:<\/function>)?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    try {
      calls.push({ name: match[1], args: JSON.parse(match[2]) });
    } catch {
      // malformed JSON in the pseudo-call — skip it rather than crash
    }
  }
  return calls;
}

function stripPseudoToolCalls(content: string): string {
  return content.replace(/<function=([a-zA-Z0-9_]+)>?\s*(\{[\s\S]*?\})\s*(?:<\/function>)?/g, "").trim();
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const identifier = user?.id ?? ip;

  const limit = await checkRateLimit({ identifier, scope: "assistant_chat", maxAttempts: 40, windowMinutes: 10 });
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: "You're sending messages a bit fast — give it a moment." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }
  await recordAttempt(identifier, "assistant_chat");

  const body = await req.json().catch(() => null);
  const rawHistory: { role: "user" | "assistant"; text: string }[] = Array.isArray(body?.messages) ? body.messages : [];
  if (rawHistory.length === 0) {
    return new Response(JSON.stringify({ error: "No message provided." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Cap how much history gets resent — older context contributes little to
  // the current answer but its token cost is paid on every single turn.
  const MAX_HISTORY_MESSAGES = 10;
  const history = rawHistory.slice(-MAX_HISTORY_MESSAGES);

  const policies = await getStorePolicies();
  const profile = user && user.role === "CUSTOMER" ? serializeCustomerProfile(user) : null;
  const orders = user && user.role === "CUSTOMER" ? await getCustomerOrders(user.id) : [];

  const profileLine = profile
    ? [
        profile.sizeTop && `top ${profile.sizeTop}`,
        profile.sizeBottom && `bottom ${profile.sizeBottom}`,
        profile.sizeShoe && `shoe ${profile.sizeShoe}`,
        profile.styleTags?.length && profile.styleTags.join(", "),
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const recentOrderLine =
    orders.length > 0
      ? `Recent order: ${orders[0].status}, ${orders[0].items.slice(0, 3).join(", ")}${orders[0].items.length > 3 ? "…" : ""}`
      : "";

  const systemPrompt = `You are ECHO, NUMEN's in-house styling concierge and personal shopper — warm, direct, a little playful, never robotic or scripted-sounding. You help customers find products, judge fit and sizing, and put together outfits, and you're genuinely happy to talk styling and fashion even when it's not about buying something right now.

Store facts: Prices in ₹. Free shipping over ₹${policies.freeShippingThreshold}, else ₹${policies.shippingFee}. COD fee ₹${policies.codFee}. Returns within ${policies.returnWindowDays} days, unworn with tags. Pay by card, UPI, or COD.

${profile?.name ? `Customer: ${profile.name}${profileLine ? ` (${profileLine})` : ""}.` : "Not signed in — no saved sizes, ask casually if it'd help."}
${recentOrderLine}

Tools: search_products for our catalog, web_search for general fashion knowledge outside it. No tool needed for small talk or opinions. Only call tools via the tool-calling mechanism — never write a call out as text (e.g. never type <function=...>).

Suggest specific NUMEN products/categories when it fits naturally — you're a stylist who works here, not a salesperson. Never share other customers' data or admin details. If unsure about a policy or product detail, say so.`;

  const groqMessages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.text }) as GroqMessage),
  ];

  let finalContent: string | null = null;

  try {
    for (let round = 0; round < 3; round++) {
      const decision = await groqDecideTools(groqMessages, TOOLS);
      const content = decision.content ?? "";
      const pseudoCalls = parsePseudoToolCalls(content);

      const hasRealToolCalls = decision.tool_calls && decision.tool_calls.length > 0;
      const hasPseudoToolCalls = pseudoCalls.length > 0;

      if (!hasRealToolCalls && !hasPseudoToolCalls) {
        finalContent = content;
        break;
      }

      if (hasRealToolCalls) {
        groqMessages.push({ role: "assistant", content, tool_calls: decision.tool_calls });
        for (const call of decision.tool_calls as GroqToolCall[]) {
          const args = JSON.parse(call.function.arguments || "{}");
          const result = await runTool(call.function.name, args);
          groqMessages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: result });
        }
      } else {
        // Fallback path: model wrote the tool call as text instead of using
        // tool_calls. Strip it from the visible reply, run it manually, and
        // feed the result back so the next round produces a real answer.
        const cleaned = stripPseudoToolCalls(content);
        groqMessages.push({ role: "assistant", content: cleaned });
        for (const pc of pseudoCalls) {
          const result = await runTool(pc.name, pc.args);
          groqMessages.push({ role: "system", content: `Tool result for ${pc.name}: ${result}` });
        }
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (finalContent !== null) {
            const words = finalContent.split(/(\s+)/);
            for (const w of words) {
              controller.enqueue(encoder.encode(w));
              await new Promise((r) => setTimeout(r, 12));
            }
          } else {
            for await (const chunk of groqStreamFinal(groqMessages)) {
              controller.enqueue(encoder.encode(chunk));
            }
          }
        } catch {
          controller.enqueue(encoder.encode("\n\n(ECHO lost connection there — mind trying that again?)"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (err) {
    console.error("Assistant chat error:", err);
    const isRateLimit = err instanceof Error && err.message.includes("429");
    return new Response(
      JSON.stringify({
        error: isRateLimit
          ? "ECHO's getting a lot of questions right now — give it about 10 seconds and try again."
          : "ECHO is having trouble responding right now — please try again shortly.",
      }),
      { status: isRateLimit ? 429 : 502, headers: { "Content-Type": "application/json" } }
    );
  }
}