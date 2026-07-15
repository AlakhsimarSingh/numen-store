"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
import { fetchReverseGeocode, fetchSearchAddress, SearchResult } from "@/src/lib/geocoding";
import "leaflet/dist/leaflet.css";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted">
      <Loader2 className="animate-spin" size={20} />
    </div>
  ),
});

export interface PickedAddress {
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat: number;
  lng: number;
}

const DEFAULT_CENTER = { lat: 30.901, lng: 75.8573 }; // Ludhiana, Punjab

export default function AddressMapPicker({ onConfirm }: { onConfirm: (address: PickedAddress) => void }) {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState("");

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function runReverseGeocode(lat: number, lng: number) {
    setGeocoding(true);
    setError("");
    try {
      const addr = await fetchReverseGeocode(lat, lng);
      setAddressLine1(addr.addressLine1);
      setCity(addr.city);
      setState(addr.state);
      setZip(addr.zip);
      setCountry(addr.country);
      setShowBreakdown(true);
    } catch {
      setError("Couldn't determine an address for that spot — you can still fill it manually below.");
      setShowBreakdown(true);
    } finally {
      setGeocoding(false);
    }
  }

  function handleMapChange(lat: number, lng: number) {
    setCenter({ lat, lng });
    runReverseGeocode(lat, lng);
  }

  function handleLocate() {
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocating(false);
        setCenter(c);
        runReverseGeocode(c.lat, c.lng);
      },
      () => {
        setLocating(false);
        setError("Couldn't access your location. Try searching or picking a spot on the map instead.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (value.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await fetchSearchAddress(value.trim());
        setResults(found);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  function handleSelectResult(result: SearchResult) {
    setShowResults(false);
    setQuery(result.label);
    setCenter({ lat: result.lat, lng: result.lng });
    setAddressLine1(result.addressLine1);
    setCity(result.city);
    setState(result.state);
    setZip(result.zip);
    setCountry(result.country);
    setShowBreakdown(true);
    setError("");
  }

  function handleConfirm() {
    onConfirm({ addressLine1, city, state, zip, country, lat: center.lat, lng: center.lng });
    setShowBreakdown(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-bg">
      <div className="relative h-56 sm:h-64">
        <LeafletMap lat={center.lat} lng={center.lng} onChange={handleMapChange} />
        {geocoding && (
          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-bg/90 px-3 py-1.5 font-mono text-[10px] text-ink backdrop-blur-sm">
            <Loader2 size={11} className="animate-spin" /> Locating address…
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/10 bg-bg/90 px-3 py-1.5 font-mono text-[10px] text-muted backdrop-blur-sm">
          Tap the map or drag the pin to set a location
        </div>
      </div>

      <div className="relative border-t border-white/5 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-surface px-3.5 py-2">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search for area, street name…"
              className="w-full bg-transparent font-body text-xs text-ink placeholder:text-muted focus:outline-none"
            />
            {searching && <Loader2 size={12} className="shrink-0 animate-spin text-muted" />}
          </div>
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-accent/40 px-3.5 py-2 font-body text-xs text-accent transition-colors hover:bg-accent hover:text-bg disabled:opacity-60"
          >
            <LocateFixed size={14} className={locating ? "animate-spin" : ""} />
            {locating ? "Locating…" : "Use current location"}
          </button>
        </div>

        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute left-3 right-3 top-[46px] z-10 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-xl sm:right-[168px]"
            >
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-surface2"
                >
                  <MapPin size={13} className="mt-0.5 shrink-0 text-muted" />
                  <span className="font-body text-xs text-ink">{r.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && <p className="border-t border-white/5 px-3 py-2 font-mono text-[10px] text-accent2">{error}</p>}

      <AnimatePresence>
        {showBreakdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-accent/20 bg-accent/5"
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                  We found this address — confirm or edit
                </p>
                <button type="button" onClick={() => setShowBreakdown(false)} className="text-muted hover:text-ink">
                  <X size={14} />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street address"
                  className="rounded-lg border border-white/10 bg-bg px-3 py-2 font-body text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 sm:col-span-2"
                />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="rounded-lg border border-white/10 bg-bg px-3 py-2 font-body text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="rounded-lg border border-white/10 bg-bg px-3 py-2 font-body text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="Postal code"
                  className="rounded-lg border border-white/10 bg-bg px-3 py-2 font-body text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                  className="rounded-lg border border-white/10 bg-bg px-3 py-2 font-body text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 font-body text-xs font-semibold text-bg transition-transform hover:scale-[1.01]"
              >
                <Check size={14} /> Fill this into the form
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}