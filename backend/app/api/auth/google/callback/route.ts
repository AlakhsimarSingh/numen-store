import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const frontendUrl = process.env.FRONTEND_URL!;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("google_oauth_state")?.value;
  const next = req.cookies.get("google_oauth_next")?.value || "/";

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/login?error=google_state_mismatch", frontendUrl));
  }

  const redirectUri = `${frontendUrl}/api/auth/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=google_token_exchange_failed", frontendUrl));
  }

  const tokenData = await tokenRes.json();

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileRes.ok) {
    return NextResponse.redirect(new URL("/login?error=google_profile_fetch_failed", frontendUrl));
  }

  const profile = await profileRes.json(); // { sub, email, name, picture, email_verified }

  if (!profile.email_verified) {
    return NextResponse.redirect(new URL("/login?error=google_email_unverified", frontendUrl));
  }

  const user = await prisma.user.upsert({
    where: { email: profile.email.toLowerCase() },
    update: { googleId: profile.sub, name: profile.name ?? undefined },
    create: {
      email: profile.email.toLowerCase(),
      name: profile.name ?? undefined,
      googleId: profile.sub,
      authProvider: "GOOGLE",
    },
  });

  await createSession(user.id, user.role === "ADMIN", {
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  const res = NextResponse.redirect(new URL(next, frontendUrl));
  res.cookies.delete("google_oauth_state");
  res.cookies.delete("google_oauth_next");
  return res;
}