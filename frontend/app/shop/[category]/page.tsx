import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchCategoryBySlugServer, fetchProductsServer } from "@/src/lib/serverApi";
import { iconOptions, iconNames } from "@/src/lib/iconMap";
import ShopGrid from "@/components/shop/ShopGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL, buildBreadcrumbJsonLd } from "@/src/lib/seo";

// Same reasoning as app/shop/page.tsx and app/products/[slug]/page.tsx —
// cached + background-revalidated instead of fully re-rendered on every
// request.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await fetchCategoryBySlugServer(slug);
  if (!category) return { title: "Category Not Found — NUMEN." };

  const title = `${category.name} — NUMEN.`;
  const description = `Shop ${category.name.toLowerCase()} at NUMEN — premium fits, honest prices, new drops weekly.`;
  const url = `${SITE_URL}/shop/${category.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "NUMEN.",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const category = await fetchCategoryBySlugServer(categorySlug);
  if (!category) return notFound();

  const allProducts = await fetchProductsServer();
  const items = allProducts.filter((p) => p.categorySlug === category.slug);
  const Icon = iconOptions[category.iconName] ?? iconOptions[iconNames[0]];

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Shop", url: `${SITE_URL}/shop` },
    { name: category.name, url: `${SITE_URL}/shop/${category.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <JsonLd data={breadcrumbJsonLd} />

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-accent">
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted">Category</p>
          <h1 className="font-display text-3xl font-bold text-ink">{category.name}</h1>
        </div>
      </div>
      <ShopGrid initialProducts={items} />
    </div>
  );
}