import Hero from "@/components/Hero";
import CategoryTicker from "@/components/CategoryTicker";
import CategoryGrid from "@/components/CategoryGrid";
import FlashDealSection from "@/components/home/FlashDealSection";
import PersonalizedSection from "@/components/home/PersonalizedSection";
import { fetchSiteSettingsForServer } from "@/src/lib/site-settings";
import {
  fetchProductsServer,
  fetchCategoriesServer,
  fetchCurrentFlashDealServer,
  // fetchTestimonialsServer,
} from "@/src/lib/serverApi";
import { buildCategorySections, buildHeroProducts, buildPersonalizationPool } from "@/src/lib/home";

// The page is now statically cached and refreshed in the background.
// (Nothing on it reads cookies/headers, so it can be served from the edge.)
export const revalidate = 60;

export default async function Home() {
  // Testimonials are commented out below, so they're no longer fetched —
  // previously that was a wasted backend call on every single page view.
  const [settings, products, categories, flashDeal] = await Promise.all([
    fetchSiteSettingsForServer(),
    fetchProductsServer(),
    fetchCategoriesServer(),
    fetchCurrentFlashDealServer(),
  ]);

  const heroProducts = buildHeroProducts(products);
  const categorySections = buildCategorySections(categories, products);
  const personalizationPool = buildPersonalizationPool(products);

  return (
    <>
      <Hero
        heroHeadlineLines={settings.heroHeadlineLines}
        heroSubtext={settings.heroSubtext}
        heroImage={settings.heroImage}
        heroVideoDesktop={settings.heroVideoDesktop}
        heroVideoMobile={settings.heroVideoMobile}
        products={heroProducts}
        customerCareNumber={settings.customerCareNumber}
        customerCareWhatsapp={settings.customerCareWhatsapp}
      />
      <CategoryTicker />
      {flashDeal && <FlashDealSection deal={flashDeal} />}
      <CategoryGrid sections={categorySections} />
      <PersonalizedSection products={personalizationPool} />
    </>
  );
}