import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Admin, auth, and private/dynamic account pages have no SEO value
        // and shouldn't be crawled at all. /search is intentionally NOT
        // disallowed here — it already carries a page-level `noindex,
        // follow` meta tag (see app/search/page.tsx), which is the more
        // precise tool: it keeps the thin query-string pages out of the
        // index while still letting crawlers follow the product links
        // those pages surface. A blanket robots.txt disallow would block
        // crawling entirely and prevent that link-following.
        disallow: ["/admin", "/admin/", "/api/", "/cart", "/checkout", "/account"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}