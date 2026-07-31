// Single source of truth for the production origin, used by robots.ts,
// sitemap.ts, and per-page canonical/OG URL construction. Set
// NEXT_PUBLIC_SITE_URL in your environment (Vercel project settings) to
// the real production domain — everything below falls back to a
// placeholder otherwise, which will produce wrong URLs in the sitemap,
// robots.txt, and canonical tags if left unset.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://numen.store").replace(/\/$/, "");

export const SITE_NAME = "NUMEN.";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface ProductJsonLdInput {
  name: string;
  description: string;
  image: string;
  url: string;
  sku: string;
  price: number;
  currency: string;
  inStock: boolean;
  brand?: string;
  // Only pass these when backed by REAL Review records — see the note in
  // app/products/[slug]/page.tsx for why. Product.rating in the schema is
  // admin-editable and defaults to 4.5 regardless of whether any reviews
  // exist, so it must never be used here directly as aggregateRating.
  reviewCount?: number;
  averageRating?: number;
}

export function buildProductJsonLd(input: ProductJsonLdInput) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: [input.image],
    sku: input.sku,
    ...(input.brand ? { brand: { "@type": "Brand", name: input.brand } } : {}),
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: input.currency,
      price: input.price.toFixed(2),
      availability: input.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  if (input.reviewCount && input.reviewCount > 0 && input.averageRating != null) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.averageRating.toFixed(1),
      reviewCount: input.reviewCount,
    };
  }

  return data;
}