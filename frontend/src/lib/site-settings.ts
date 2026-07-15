export interface SiteSettingsDTO {
  siteName: string;
  tagline: string;
  heroHeadlineLines: string[];
  heroSubtext: string;
  heroImage: string;
  freeShippingThreshold: number;
  shippingFee: number;
  taxRate: number;
  codFee: number;
  announcementEnabled: boolean;
  announcementText: string;
  maintenanceMode: boolean;
}

const DEFAULT_SETTINGS: SiteSettingsDTO = {
  siteName: "NUMEN.",
  tagline: "Wear the Drop",
  heroHeadlineLines: ["WEAR", "THE", "DROP."],
  heroSubtext: "26 categories. Zero filler. Premium fits at prices that don't punish you for having taste.",
  heroImage: "/hero-bg.jpg",
  freeShippingThreshold: 75,
  shippingFee: 6.99,
  taxRate: 0.08,
  codFee: 2,
  announcementEnabled: false,
  announcementText: "",
  maintenanceMode: false,
};

export async function fetchSiteSettings(): Promise<SiteSettingsDTO> {
  const res = await fetch("/api/site-settings");
  if (!res.ok) throw new Error("Failed to load site settings.");
  return res.json();
}

export async function updateSiteSettings(updates: Partial<SiteSettingsDTO>): Promise<SiteSettingsDTO> {
  const res = await fetch("/api/site-settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update site settings.");
  return data;
}

/**
 * Server Components only. Calls the backend directly (BACKEND_URL) instead of
 * "/api/site-settings", because a relative fetch() from server-side code is a
 * real outbound network call — it does NOT go through next.config.ts rewrites,
 * which only apply to requests arriving from the browser.
 */
export async function fetchSiteSettingsForServer(): Promise<SiteSettingsDTO> {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
  try {
    const res = await fetch(`${backendUrl}/api/site-settings`, { cache: "no-store" });
    if (!res.ok) return DEFAULT_SETTINGS;
    return await res.json();
  } catch {
    return DEFAULT_SETTINGS;
  }
}