import { fetchProductsServer, fetchCategoriesServer } from "@/src/lib/serverApi";
import ShopGrid from "@/components/shop/ShopGrid";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [products, categories] = await Promise.all([fetchProductsServer(), fetchCategoriesServer()]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">Full Catalog</p>
      <h1 className="mb-8 font-display text-3xl font-bold text-ink sm:text-4xl">All Products</h1>
      <ShopGrid initialProducts={products} categories={categories} showCategoryFilter />
    </div>
  );
}