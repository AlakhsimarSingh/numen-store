import { NextRequest, NextResponse } from "next/server";
import { searchAddress } from "@/lib/geocoding";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limit = await checkRateLimit({ identifier: ip, scope: "geocoding", maxAttempts: 30, windowMinutes: 5 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many location lookups. Try again shortly." }, { status: 429 });
  }
  await recordAttempt(ip, "geocoding");

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ error: "Search query too short." }, { status: 400 });
  }

  try {
    const results = await searchAddress(q);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Search failed." }, { status: 502 });
  }
}