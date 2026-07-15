"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";
import { fetchProducts } from "@/src/lib/products";
import { buildSearchIndex, searchProducts, type SearchResult } from "@/src/lib/search";
import { Product } from "@/src/types";
import { formatPrice, cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

function AttributeBadges({ result }: { result: SearchResult }) {
  if (result.matchedColors.length === 0 && result.matchedSizes.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {result.matchedColors.map((c) => {
        const soldOut = c.stock === 0;
        return (
          <span
            key={c.name}
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[10px]",
              soldOut ? "border-white/5 text-muted/50 line-through" : "border-white/10 text-muted"
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
              style={{ backgroundColor: c.hex }}
            />
            {c.name}
            {!soldOut && c.stock !== undefined && c.stock <= 5 && (
              <span className="text-accent">· {c.stock} left</span>
            )}
          </span>
        );
      })}
      {result.matchedSizes.map((s) => {
        const soldOut = s.stock === 0;
        return (
          <span
            key={s.size}
            className={cn(
              "rounded-full border px-1.5 py-0.5 font-mono text-[10px]",
              soldOut ? "border-white/5 text-muted/50 line-through" : "border-white/10 text-muted"
            )}
          >
            Size {s.size}
            {!soldOut && s.stock !== undefined && s.stock <= 5 && <span className="text-accent"> · {s.stock} left</span>}
          </span>
        );
      })}
    </div>
  );
}

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

  const searchIndex = useMemo(() => buildSearchIndex(products), [products]);

  const q = query.trim();
  const results = useMemo(() => {
    if (q.length === 0) return [];
    return searchProducts(q, products, searchIndex);
  }, [q, products, searchIndex]);

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
                placeholder="Search products, categories, colors, sizes…"
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
                  results.map((r) => (
                    <Link
                      key={r.product.id}
                      href={`/product/${r.product.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-4 border-b border-white/5 px-5 py-3 transition-colors last:border-0 hover:bg-surface2"
                    >
                      <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-surface2">
                        <Image src={r.product.image} alt={r.product.name} fill sizes="48px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm text-ink">{r.product.name}</p>
                        <p className="font-mono text-xs text-muted">{formatPrice(r.product.price)}</p>
                        <AttributeBadges result={r} />
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