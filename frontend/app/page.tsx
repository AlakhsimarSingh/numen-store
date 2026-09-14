import Hero from "@/components/Hero";
import CategoryTicker from "@/components/CategoryTicker";
import CategoryGrid from "@/components/CategoryGrid";
import FlashDealSection from "@/components/home/FlashDealSection";
import PersonalizedSection from "@/components/home/PersonalizedSection";
import BestSellersSection from "@/components/home/BestSellersSection";
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
        heroVideoDesktop={settings.heroVideoDesktop}
        heroVideoMobile={settings.heroVideoMobile}
        products={products}
        customerCareNumber={settings.customerCareNumber}
        customerCareWhatsapp={settings.customerCareWhatsapp}
      />
      <CategoryTicker />
      {flashDeal && <FlashDealSection deal={flashDeal} />}
      <CategoryGrid />
      <BestSellersSection products={products} />
      <PersonalizedSection products={products} />
      <TestimonialsSection testimonials={testimonials} />
    </>
  );
}