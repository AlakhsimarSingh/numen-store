import Hero from "@/components/Hero";
import CategoryTicker from "@/components/CategoryTicker";
import FlashDealSection from "@/components/home/FlashDealSection";
import PersonalizedSection from "@/components/home/PersonalizedSection";
import FeaturedProducts from "@/components/FeaturedProducts";
import BestSellersSection from "@/components/home/BestSellersSection";
import RecentlyViewedSection from "@/components/home/RecentlyViewedSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import { fetchSiteSettingsForServer } from "@/src/lib/site-settings";
import { fetchProductsServer, fetchCurrentFlashDealServer, fetchTestimonialsServer } from "@/src/lib/serverApi";

export default async function Home() {
  const [settings, products, flashDeal, testimonials] = await Promise.all([
    fetchSiteSettingsForServer(),
    fetchProductsServer(),
    fetchCurrentFlashDealServer(),
    fetchTestimonialsServer(),
  ]);

  return (
    <>
      <Hero
        heroHeadlineLines={settings.heroHeadlineLines}
        heroSubtext={settings.heroSubtext}
        heroImage={settings.heroImage}
        products={products}
      />
      <CategoryTicker />
      {flashDeal && <FlashDealSection deal={flashDeal} />}
      <PersonalizedSection products={products} />
      <FeaturedProducts products={products} />
      <BestSellersSection products={products} />
      <RecentlyViewedSection products={products} />
      <TestimonialsSection testimonials={testimonials} />
    </>
  );
}