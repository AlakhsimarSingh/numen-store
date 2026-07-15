"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";
import { fetchProducts } from "@/src/lib/products";
import { Product } from "@/src/types";
import { formatPrice } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      const t = setTimeout(() => inputRef.current?.focus(), 100);

      // Fetch once, the first time the overlay is actually opened — no
      // point loading the whole catalog on every page load just in case
      // someone searches.
      if (!loaded) {
        setLoading(true);
        fetchProducts()
          .then((data) => {
            setProducts(data);
            setLoaded(true);
          })
          .catch(() => {
            // Silently fail — search will just show "no results" rather than crash the nav.
          })
          .finally(() => setLoading(false));
      }

      return () => clearTimeout(t);
    }
  }, [open, loaded]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const results =
    q.length === 0
      ? []
      : products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.categorySlug.toLowerCase().includes(q)
          )
          .slice(0, 8);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease }}
          className="fixed inset-0 z-[100] bg-bg/90 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease }}
            className="mx-auto mt-24 w-full max-w-2xl px-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface px-5 py-4">
              <Search size={20} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, categories…"
                className="w-full bg-transparent font-body text-base text-ink placeholder:text-muted focus:outline-none"
              />
              {loading && <Loader2 size={16} className="shrink-0 animate-spin text-muted" />}
              <button
                onClick={onClose}
                aria-label="Close search"
                className="shrink-0 text-muted transition-colors hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            {q.length > 0 && (
              <div className="mt-3 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/5 bg-surface">
                {loading ? (
                  <div className="flex items-center justify-center px-5 py-10">
                    <Loader2 size={20} className="animate-spin text-muted" />
                  </div>
                ) : results.length === 0 ? (
                  <p className="px-5 py-6 font-body text-sm text-muted">
                    No results for &ldquo;{query}&rdquo;.
                  </p>
                ) : (
                  results.map((p) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-4 border-b border-white/5 px-5 py-3 transition-colors last:border-0 hover:bg-surface2"
                    >
                      <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-surface2">
                        <Image src={p.image} alt={p.name} fill sizes="48px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm text-ink">{p.name}</p>
                        <p className="font-mono text-xs text-muted">{formatPrice(p.price)}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}