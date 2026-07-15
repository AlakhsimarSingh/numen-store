const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "NUMEN-Store/1.0 (support@numen.store)";
const MIN_INTERVAL_MS = 1100; // safety margin over Nominatim's 1 req/sec policy

let lastCallTime = 0;
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(async () => {
    const wait = Math.max(0, lastCallTime + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallTime = Date.now();
    return fn();
  });
  queue = result.catch(() => {}); // one failure shouldn't jam the queue for everyone else
  return result;
}

async function nominatimFetch(url: string) {
  return enqueue(() => fetch(url, { headers: { "User-Agent": USER_AGENT } }));
}

export interface GeocodedAddress {
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface SearchResult extends GeocodedAddress {
  label: string;
  lat: number;
  lng: number;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

function parseAddress(addr: NominatimAddress): GeocodedAddress {
  const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
  return {
    addressLine1: street || addr.suburb || addr.neighbourhood || "",
    city: addr.city || addr.town || addr.village || addr.county || "",
    state: addr.state || "",
    zip: addr.postcode || "",
    country: addr.country || "",
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
  const res = await nominatimFetch(url);
  if (!res.ok) throw new Error("Reverse geocoding failed.");
  const data = await res.json();
  if (!data.address) throw new Error("No address found for this location.");
  return parseAddress(data.address);
}

export async function searchAddress(query: string): Promise<SearchResult[]> {
  const url = `${NOMINATIM_BASE}/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`;
  const res = await nominatimFetch(url);
  if (!res.ok) throw new Error("Address search failed.");
  const data = await res.json();
  return (data as { address: NominatimAddress; display_name: string; lat: string; lon: string }[]).map((r) => ({
    ...parseAddress(r.address ?? {}),
    label: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}