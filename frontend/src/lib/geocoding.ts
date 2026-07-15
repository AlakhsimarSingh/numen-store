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

export async function fetchReverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  const res = await fetch(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Lookup failed.");
  return data;
}

export async function fetchSearchAddress(query: string): Promise<SearchResult[]> {
  const res = await fetch(`/api/geocoding/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Search failed.");
  return data;
}