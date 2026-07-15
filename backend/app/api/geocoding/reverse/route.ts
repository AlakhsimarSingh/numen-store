import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geocoding";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limit = await checkRateLimit({ identifier: ip, scope: "geocoding", maxAttempts: 30, windowMinutes: 5 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many location lookups. Try again shortly." }, { status: 429 });
  }
  await recordAttempt(ip, "geocoding");

  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  try {
    const address = await reverseGeocode(lat, lng);
    return NextResponse.json(address);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Lookup failed." }, { status: 502 });
  }
}