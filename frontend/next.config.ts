import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fyhofnctreakofefpjjk.supabase.co" },
    ],
    // Vercel's built-in Image Optimization (the /_next/image proxy that
    // resizes/re-encodes every remote image) is metered, and the account
    // has hit its transformation quota — every optimized image request was
    // coming back 402 Payment Required. Setting `unoptimized: true` makes
    // <Image> render a plain <img> pointing straight at the original
    // Supabase/picsum URL instead of routing through that proxy, so images
    // load immediately regardless of quota. Trade-off: you lose automatic
    // resizing/format conversion (WebP/AVIF) and the `sizes`-based
    // responsive srcset — images are served at their original file size.
    // Remove this once the quota issue is resolved (upgrade the Vercel
    // plan / raise the spend limit, or switch to Supabase's own image
    // transformation endpoint as a custom loader) to get that back.
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;