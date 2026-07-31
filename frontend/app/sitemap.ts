import type { MetadataRoute } from "next";
import { fetchProductsServer, fetchCategoriesServer } from "@/src/lib/serverApi";
import { SITE_URL } from "@/src/lib/seo";
 
// Next.js serves this at /sitemap.xml automatically. Regenerated on each
// request per the revalidate window below rather than at build time only —
// with products/categories changing via the admin panel, a build-time-only
// sitemap would drift stale until the next deploy.
export const revalidate = 3600; // 1 hour
 
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([fetchProductsServer(), fetchCategoriesServer()]);
 
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/refund-policy`, changeFrequency: "yearly", priority: 0.2 },
  ];
 
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/shop/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));
 
  // NOTE: the frontend Product type doesn't currently expose updatedAt,
  // even though the Prisma model has it — so `lastModified` is omitted
  // here rather than faked. Worth adding to the type + serverApi response
  // if you want more accurate crawl-freshness signals per product.
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
 
  // At ~440 products today this is one sitemap file, well under the
  // 50,000-URL limit a single sitemap can hold. If the catalog grows past
  // that, this needs to switch to generateSitemaps() to split into an
  // indexed set of sitemap files instead.
  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
