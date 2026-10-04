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
  try {
    if (name === "search_products") return JSON.stringify(await searchCatalog(String(args.query ?? "")));
    if (name === "web_search") return JSON.stringify(await webSearch(String(args.query ?? "")));
    return JSON.stringify({ error: "Unknown tool" });
  } catch {
    // A failing tool (e.g. web search down) should not take the whole reply down.
    return JSON.stringify({ error: "Tool unavailable right now." });
  }
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

/* ------------------------------------------------------------------ */
/* Catalog prefetch                                                    */
/* ------------------------------------------------------------------ */
/**
 * If the customer's message looks like a product question, look the catalog up
 * BEFORE calling the model, in parallel with the other DB reads. This:
 *  - saves a whole LLM round-trip (the model no longer has to decide to call
 *    search_products, wait for it, then answer), and
 *  - stops the model inventing products/prices from thin air, which is what
 *    happened when it answered "what's new in jackets" without any lookup.
 */
const PRODUCT_INTENT =
  /\b(show|find|looking|look for|recommend|suggest|have|got|stock|available|availability|price|prices|cost|cheap|cheaper|budget|under|buy|new|latest|arrival|arrivals|drop|drops|collection|outfit|style|wear|size|fit|fits|colou?r|jacket|jackets|shirt|shirts|tee|tees|hoodie|hoodies|pants|jeans|cargo|shoes|sneakers|watch|watches|perfume|perfumes|shades|sunglasses|purse|bag|bags|slippers)\b/i;

const STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "have", "has", "got", "any", "what", "whats", "what's", "are", "there", "is",
  "was", "can", "could", "would", "should", "please", "show", "find", "looking", "look", "recommend", "suggest",
  "some", "something", "anything", "with", "about", "from", "that", "this", "these", "those", "want", "need",
  "like", "into", "just", "tell", "give", "let", "how", "much", "does", "do", "did", "available", "availability",
  "stock", "buy", "get", "under", "around", "price", "prices", "cost", "hey", "hello", "hi", "me", "my", "our", "u",
  "new", "latest", "arrival", "arrivals", "drop", "drops", "now", "currently", "right", "today", "in", "on", "of",
  "to", "a", "an", "it", "its", "i", "im", "i'm",
]);

function extractSearchQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .slice(0, 4)
    .join(" ");
}

function resultCount(result: unknown): number {
  if (Array.isArray(result)) return result.length;
  if (result && typeof result === "object") {
    const products = (result as { products?: unknown }).products;
    if (Array.isArray(products)) return products.length;
    return Object.keys(result).length;
  }
  return 0;
}

function compactCatalog(result: unknown): string {
  if (Array.isArray(result)) return JSON.stringify(result.slice(0, 6));
  if (result && typeof result === "object") {
    const products = (result as { products?: unknown }).products;
    if (Array.isArray(products)) return JSON.stringify({ ...(result as object), products: products.slice(0, 6) });
  }
  return JSON.stringify(result).slice(0, 4000);
}

async function prefetchCatalog(latestUserText: string): Promise<string | null> {
  if (!PRODUCT_INTENT.test(latestUserText)) return null;
  const query = extractSearchQuery(latestUserText);
  if (!query) return null;

  try {
    let result: unknown = await searchCatalog(query);
    if (resultCount(result) === 0) {
      // Multi-word queries can be too strict — retry with the longest keyword.
      const longest = query.split(" ").sort((a, b) => b.length - a.length)[0];
      if (longest && longest !== query) result = await searchCatalog(longest);
    }
    return resultCount(result) > 0 ? compactCatalog(result) : "[]";
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Output pacing                                                       */
/* ------------------------------------------------------------------ */
/**
 * The reply is already fully generated at this point. The old code re-emitted it
 * one token at a time with a 12ms sleep after each (whitespace included), which
 * added ~5-8 seconds to a normal answer. Now it goes out in ~28-char chunks and
 * the total artificial delay is capped at well under a second. Newlines are
 * preserved so Markdown (lists, tables) survives.
 */
function chunkText(text: string, size = 28): string[] {
  const out: string[] = [];
  let buf = "";
  for (const token of text.split(/(\s+)/)) {
    if (buf && buf.length + token.length > size) {
      out.push(buf);
      buf = "";
    }
    buf += token;
  }
  if (buf) out.push(buf);
  return out;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
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
  const rawHistory: { role: "user" | "assistant"; text: string }[] = (Array.isArray(body?.messages) ? body.messages : [])
    .filter(
      (m: { role?: unknown; text?: unknown }) =>
        (m?.role === "user" || m?.role === "assistant") && typeof m?.text === "string" && m.text.trim().length > 0
    )
    .map((m: { role: "user" | "assistant"; text: string }) => ({ role: m.role, text: m.text.slice(0, 2000) }));

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
  const latestUserText = [...history].reverse().find((m) => m.role === "user")?.text ?? "";

  // All independent reads run at the same time instead of one after another.
  const isCustomer = !!user && user.role === "CUSTOMER";
  const [policies, orders, catalogJson] = await Promise.all([
    getStorePolicies(),
    isCustomer ? getCustomerOrders(user!.id) : Promise.resolve([]),
    prefetchCatalog(latestUserText),
  ]);
  const profile = isCustomer ? serializeCustomerProfile(user!) : null;

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

  // A huge threshold means the admin has effectively switched free shipping off.
  const freeShippingLine =
    Number(policies.freeShippingThreshold) >= 100000
      ? `Free shipping is not currently offered; standard shipping is ₹${policies.shippingFee}.`
      : `Free shipping over ₹${policies.freeShippingThreshold}, else ₹${policies.shippingFee}.`;

  const catalogSection =
    catalogJson === null
      ? "No catalog lookup has been run for this message. If the customer asks about products, prices, availability or what's new, call search_products first."
      : catalogJson === "[]"
        ? "A catalog lookup for this message returned NO matching products. Say so plainly and suggest the closest category or ask what they're after — do not invent products."
        : `CATALOG MATCHES for the customer's latest message (real, current data):\n${catalogJson}`;

  const systemPrompt = `You are ECHO, NUMEN's in-house styling concierge and personal shopper — warm, direct, a little playful, never robotic or scripted-sounding. You help customers find products, judge fit and sizing, and put together outfits, and you're genuinely happy to talk styling and fashion even when it's not about buying something right now.

HOW TO WRITE (you're inside a small chat bubble, about 380px wide):
- Keep it short: usually 40-120 words. Go longer only if the customer asks for detail or a full outfit breakdown.
- Answer only what was asked. Don't bring up shipping, returns or payment unless asked or directly relevant.
- Use Markdown: short paragraphs, **bold** for product names and key facts, and "-" bullet lists (max 5 bullets). Put each product on its own bullet like: **Name** — why it's good — ₹price.
- Use a table ONLY to compare 2-4 products side by side, with at most 3 short columns. Never use a table for anything else.
- No headings, no horizontal rules, at most one or two emoji.
- For every recommended product, show a clickable image using [![Name](image-url)](/product/<slug>), then link its name as [Name](/product/<slug>) and include its price. Use only the image URL and slug from the catalog result.
- End with at most one short follow-up question.

GROUNDING (important):
- Only recommend products, or quote prices, materials, sizes or stock, that appear in the catalog data below or in a search_products result. Never invent any of them.
- If nothing matches, say so and suggest the closest category.
- Quote the store facts below exactly as written; never convert or round them.

Store facts: Prices in ₹. ${freeShippingLine} COD fee ₹${policies.codFee}. Returns within ${policies.returnWindowDays} days, unworn with tags. Pay by card, UPI, or COD.

${profile?.name ? `Customer: ${profile.name}${profileLine ? ` (${profileLine})` : ""}.` : "Not signed in — no saved sizes, ask casually if it'd help."}
${recentOrderLine}

${catalogSection}

Tools: search_products for our catalog (use it again if the matches above don't cover what they asked), web_search for general fashion knowledge outside it. No tool needed for small talk or opinions. Only call tools via the tool-calling mechanism — never write a call out as text (e.g. never type <function=...>).

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
        const calls = decision.tool_calls as GroqToolCall[];
        // Run all requested tools at the same time.
        const results = await Promise.all(
          calls.map(async (call) => {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.function.arguments || "{}");
            } catch {
              // bad arguments from the model: fall through with empty args
            }
            return { call, result: await runTool(call.function.name, args) };
          })
        );
        for (const { call, result } of results) {
          groqMessages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: result });
        }
      } else {
        // Fallback path: model wrote the tool call as text instead of using
        // tool_calls. Strip it from the visible reply, run it manually, and
        // feed the result back so the next round produces a real answer.
        const cleaned = stripPseudoToolCalls(content);
        groqMessages.push({ role: "assistant", content: cleaned });
        const results = await Promise.all(
          pseudoCalls.map(async (pc) => ({ name: pc.name, result: await runTool(pc.name, pc.args) }))
        );
        for (const { name, result } of results) {
          groqMessages.push({ role: "system", content: `Tool result for ${name}: ${result}` });
        }
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (finalContent !== null) {
            const text = stripPseudoToolCalls(finalContent) || "Sorry, I didn't catch that — could you rephrase?";
            const chunks = chunkText(text);
            const delayMs = Math.min(14, Math.floor(600 / Math.max(1, chunks.length)));
            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(chunk));
              if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
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