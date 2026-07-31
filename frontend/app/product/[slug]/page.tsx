import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchProductBySlugServer, fetchProductsServer, fetchCategoriesServer } from "@/src/lib/serverApi";
import { fetchSiteSettingsForServer } from "@/src/lib/site-settings";
import ProductDetail from "@/components/product/ProductDetail";
import ProductCard from "@/components/ProductCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL, buildBreadcrumbJsonLd, buildProductJsonLd } from "@/src/lib/seo";

// Was force-dynamic — same issue as the shop pages had: zero caching,
// full re-fetch + re-render on every single request. ISR serves a cached
// version and rebuilds in the background at most once a minute, which is
// plenty fresh for a product page (price/stock changes aren't second-to-
// second) and meaningfully faster for both users and crawlers.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlugServer(slug);
  if (!product) return { title: "Product Not Found — NUMEN." };

  const categoryLabel = product.categorySlug.replace(/-/g, " ");
  // Prefer the SEO fields already generated server-side when the product
  // was created (see generateSeoFields in the bulk-import route) — falls
  // back to a constructed string only if those are empty.
  const title = product.metaTitle || `${product.name} — NUMEN.`;
  const description =
    product.metaDescription || `${product.name} — premium fit from NUMEN's ${categoryLabel} lineup. Shop now.`;
  const url = `${SITE_URL}/products/${product.slug}`;

  return {
    title,
    description,
    keywords: product.keywords?.length ? product.keywords : undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "NUMEN.",
      images: [{ url: product.image, width: 1200, height: 1500, alt: product.name }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProductBySlugServer(slug);
  if (!product) return notFound();

  const [categories, allProducts, siteSettings] = await Promise.all([
    fetchCategoriesServer(),
    fetchProductsServer(),
    fetchSiteSettingsForServer(),
  ]);
  const category = categories.find((c) => c.slug === product.categorySlug);
  const categoryName = category?.name ?? product.categorySlug;

  const related = allProducts
    .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id)
    .slice(0, 4);

  const productUrl = `${SITE_URL}/products/${product.slug}`;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Shop", url: `${SITE_URL}/shop` },
    { name: categoryName, url: `${SITE_URL}/shop/${product.categorySlug}` },
    { name: product.name, url: productUrl },
  ]);

  // aggregateRating/review structured data is intentionally NOT included
  // here. Product.rating is an admin-editable field (defaults to 4.5
  // whether or not any reviews exist) — using it directly as
  // aggregateRating would violate Google's structured data guidelines,
  // which require ratings to reflect genuine user reviews, and risks the
  // rich result being stripped or the site receiving a manual action.
  // To add this properly, fetch the real review count + computed average
  // for this product SERVER-SIDE here (not the client-side fetch
  // ProductDetail already does) and pass reviewCount/averageRating into
  // buildProductJsonLd only when reviewCount > 0.
  const productJsonLd = buildProductJsonLd({
    name: product.name,
    description: product.metaDescription || `${product.name} — premium fit from NUMEN's ${categoryName} lineup.`,
    image: product.image,
    url: productUrl,
    sku: product.id,
    price: product.price,
    currency: "INR",
    inStock: product.stock > 0,
    brand: "NUMEN",
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={productJsonLd} />

      <ProductDetail
        product={product}
        categoryName={categoryName}
        freeShippingThreshold={siteSettings.freeShippingThreshold}
      />

      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="mb-6 font-display text-2xl font-bold text-ink">You might also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}