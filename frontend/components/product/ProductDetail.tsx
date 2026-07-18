"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { Product } from "@/src/types";
import { cn } from "@/src/lib/utils";
import { useCartStore } from "@/src/hooks/useCartStore";
import { useRecentlyViewedStore } from "@/src/hooks/useRecentlyViewedStore";
import { useToastStore } from "@/src/hooks/useToastStore";
import { useSiteSettingsStore } from "@/src/hooks/useSiteSettingsStore";
import { computeRatingSummary, fetchProductReviews, Review } from "@/src/lib/reviews";
import { StarRatingDisplay } from "./StarRating";
import SizeGuideModal from "./SizeGuideModal";
import ReviewsSection from "./ReviewsSection";
import { useProductPrice } from "@/src/hooks/useProductPrice";

const ease = [0.16, 1, 0.3, 1] as const;

export default function ProductDetail({
  product,
  categoryName,
}: {
  product: Product;
  categoryName: string;
}) {
  const hasRealColors = !!product.colors && product.colors.some((c) => c.name !== "Default");
  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];

  const [selectedColor, setSelectedColor] = useState(colors[0]?.name ?? "");
  const [selectedSize, setSelectedSize] = useState(sizes[0] ?? "");
  const [activeMedia, setActiveMedia] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const showToast = useToastStore((s) => s.show);
  const addView = useRecentlyViewedStore((s) => s.addView);
  const freeShippingThreshold = useSiteSettingsStore((s) => s.freeShippingThreshold);

  useEffect(() => {
    addView(product.id);
  }, [product.id, addView]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);
    fetchProductReviews(product.id)
      .then((data) => {
        if (!cancelled) setReviews(data);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const summary = useMemo(() => computeRatingSummary(product.rating, 12, reviews), [product.rating, reviews]);
  const { formattedPrice, formattedCompareAt, estimated } = useProductPrice(product);

  const activeColorObj = colors.find((c) => c.name === selectedColor);

  // Memoized so the array reference stays stable across unrelated re-renders
  // (qty changes, add-to-cart toast, reviews loading, etc.) — otherwise the
  // autoplay effect below (which depends on `gallery`) would restart its
  // 4s timer on every unrelated render instead of only when the actual
  // media set changes.
  const gallery = useMemo<{ type: "image" | "video"; src: string }[]>(
    () =>
      activeColorObj
        ? [
            ...activeColorObj.images.map((img) => ({ type: "image" as const, src: img })),
            ...(activeColorObj.video ? [{ type: "video" as const, src: activeColorObj.video }] : []),
          ]
        : [product.image, ...product.images, ...(product.video ? [product.video] : [])].map((src, i, arr) => ({
            type: (product.video && i === arr.length - 1 ? "video" : "image") as "image" | "video",
            src,
          })),
    [activeColorObj, product.image, product.images, product.video]
  );

  useEffect(() => setActiveMedia(0), [selectedColor]);

  const [autoplayPaused, setAutoplayPaused] = useState(false);

  // Auto-advance through gallery images every 4s — pauses on hover so
  // shoppers can linger, and never auto-advances away from a playing video.
  useEffect(() => {
    if (gallery.length <= 1 || autoplayPaused) return;
    if (gallery[activeMedia]?.type === "video") return;
    const timer = setTimeout(() => {
      setActiveMedia((i) => (i + 1) % gallery.length);
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeMedia, gallery, autoplayPaused]);

  // Both axes need the same fallback the admin's VariantsEditor.rebuildMatrix
  // uses when storing data: a product with no real colors is keyed under
  // "Default", a product with no real sizes is keyed under "One Size". Also
  // guards against product.variantStock being null/undefined entirely
  // (plain products with no variants at all) — calling .find() on that
  // would throw.
  const variantStock = useMemo(() => {
    if (!product.variantStock) return null;
    const effectiveColorKey = hasRealColors ? selectedColor : "Default";
    const effectiveSizeKey = sizes.length > 0 ? selectedSize : "One Size";
    const entry = product.variantStock.find(
      (v) => v.color === effectiveColorKey && v.size === effectiveSizeKey
    );
    return entry ? entry.stock : 0;
  }, [product.variantStock, selectedColor, selectedSize, hasRealColors, sizes.length]);

  const effectiveStock = variantStock !== null ? variantStock : product.stock;
  const outOfStock = effectiveStock === 0;
  const lowStock = effectiveStock > 0 && effectiveStock <= 5;
  const needsVariantSelection = (hasRealColors && !selectedColor) || (sizes.length > 0 && !selectedSize);
  function handleAddToCart() {
    if (needsVariantSelection) {
      showToast("Select a size" + (hasRealColors ? " and color" : "") + " first", "error");
      return;
    }
    addItem(product, qty, {
      color: hasRealColors ? selectedColor : undefined,
      size: sizes.length > 0 ? selectedSize : undefined,
    });
    setAdded(true);
    showToast(`${qty} × ${product.name} added to cart`);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-1.5 font-body text-xs text-muted">
        <Link href="/shop" className="hover:text-ink">Shop</Link>
        <ChevronRight size={12} />
        <Link href={`/shop/${product.categorySlug}`} className="hover:text-ink">{categoryName}</Link>
        <ChevronRight size={12} />
        <span className="truncate text-ink/70">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <div
            className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-surface2"
            onMouseEnter={() => setAutoplayPaused(true)}
            onMouseLeave={() => setAutoplayPaused(false)}
          >
            <AnimatePresence mode="wait">
              {gallery[activeMedia]?.type === "video" ? (
                <motion.video
                  key={gallery[activeMedia].src}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease }}
                  src={gallery[activeMedia].src}
                  controls
                  className="h-full w-full object-cover"
                />
              ) : (
                <motion.div
                  key={gallery[activeMedia]?.src ?? "fallback"}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease }}
                  className="absolute inset-0"
                >
                  <Image
                    src={gallery[activeMedia]?.src ?? product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {product.isNew && (
              <span className="absolute left-4 top-4 z-10 rounded-full bg-accent px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-bg">New</span>
            )}
            {product.compareAtPrice && (
              <span className="absolute right-4 top-4 z-10 rounded-full bg-accent2 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">Sale</span>
            )}

            {gallery.length > 1 && (
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveMedia(i)}
                    aria-label={`Go to image ${i + 1}`}
                    className={cn(
                      "h-1.5 rounded-full bg-bg/60 backdrop-blur-sm transition-all",
                      i === activeMedia ? "w-6 bg-accent" : "w-1.5 hover:bg-bg/90"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5, ease }}>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">{categoryName}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{product.name}</h1>

          <a href="#reviews" className="mt-3 flex items-center gap-2">
            <StarRatingDisplay rating={summary.average} size={14} />
            <span className="font-mono text-sm text-ink">{summary.average.toFixed(1)}</span>
            <span className="font-body text-xs text-muted">({summary.totalCount} review{summary.totalCount !== 1 ? "s" : ""})</span>
          </a>

          <p className="mt-2 font-body text-xs text-muted">
            {outOfStock ? "Sold out" : lowStock ? `Only ${effectiveStock} left` : "In stock"}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <span className="font-mono text-2xl text-ink">{formattedPrice}</span>
            {formattedCompareAt && <span className="font-mono text-base text-muted line-through">{formattedCompareAt}</span>}
          </div>
          {estimated && (
            <p className="mt-1 font-mono text-[10px] text-muted">Converted estimate — exact pricing shown at checkout.</p>
          )}

          <p className="mt-5 max-w-md font-body text-sm leading-relaxed text-muted">
            Cut from premium materials and finished for everyday wear. Part of the {categoryName.toLowerCase()} lineup — built to hold up, drop after drop.
          </p>

          {hasRealColors && (
            <div className="mt-6">
              <p className="mb-2 font-body text-xs text-muted">
                Color{selectedColor ? `: ${selectedColor}` : ""}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    aria-label={c.name}
                    className={cn(
                      "h-9 w-9 rounded-full border-2 transition-transform",
                      selectedColor === c.name ? "border-accent scale-110" : "border-white/15"
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-body text-xs text-muted">Size{selectedSize ? `: ${selectedSize}` : ""}</p>
                <SizeGuideModal categorySlug={product.categorySlug} />
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((sz) => {
                  const effectiveColorKey = hasRealColors ? selectedColor : "Default";
                  const stockForSize = product.variantStock?.find(
                    (v) => v.color === effectiveColorKey && v.size === sz
                  )?.stock;
                  const disabled = stockForSize === 0;
                  return (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      disabled={disabled}
                      className={cn(
                        "rounded-full border px-4 py-1.5 font-body text-xs transition-colors",
                        disabled
                          ? "cursor-not-allowed border-white/5 text-muted/40 line-through"
                          : selectedSize === sz
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-white/10 text-muted hover:text-ink"
                      )}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-full border border-white/10 px-2 py-2">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-ink">
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-mono text-sm text-ink">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(effectiveStock || 1, q + 1))} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-ink">
                <Plus size={14} />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={cn(
                "flex-1 rounded-full py-3.5 font-body text-sm font-semibold transition-transform",
                outOfStock ? "cursor-not-allowed bg-surface2 text-muted" : added ? "bg-accent/80 text-bg" : "bg-accent text-bg hover:scale-[1.02]"
              )}
            >
              {outOfStock ? "Sold Out" : added ? "Added to Cart ✓" : "Add to Cart"}
            </button>
          </div>

          <div className="mt-8 space-y-3 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3 font-body text-xs text-muted">
              <Truck size={15} className="text-accent" /> Free shipping on orders over ₹{freeShippingThreshold}
            </div>
            <div className="flex items-center gap-3 font-body text-xs text-muted">
              <ShieldCheck size={15} className="text-accent" /> 30-day hassle-free returns
            </div>
          </div>
        </motion.div>
      </div>

      <div id="reviews">
        <ReviewsSection product={product} reviews={reviews} loading={reviewsLoading} onReviewsChange={setReviews} />
      </div>
    </div>
  );
}