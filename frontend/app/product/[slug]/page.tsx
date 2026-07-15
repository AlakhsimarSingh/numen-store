import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchProductBySlugServer, fetchProductsServer, fetchCategoriesServer } from "@/src/lib/serverApi";
import ProductDetail from "@/components/product/ProductDetail";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlugServer(slug);
  if (!product) return { title: "Product Not Found — NUMEN." };

  return {
    title: `${product.name} — NUMEN.`,
    description: `${product.name} — premium fit from NUMEN's ${product.categorySlug.replace(/-/g, " ")} lineup. Shop now.`,
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

  const [categories, allProducts] = await Promise.all([fetchCategoriesServer(), fetchProductsServer()]);
  const category = categories.find((c) => c.slug === product.categorySlug);

  const related = allProducts
    .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <ProductDetail product={product} categoryName={category?.name ?? product.categorySlug} />

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