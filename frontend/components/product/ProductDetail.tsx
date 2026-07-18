"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

/* eslint-disable @next/next/no-img-element -- the glitch overlay below uses
   plain <img> for short-lived decorative duplicates of the active image;
   next/image's optimizer adds nothing here and would complicate the
   channel-split filters. */

const ease = [0.16, 1, 0.3, 1] as const;

// Sharp, deliberate "digital" easing for the gallery wipe — snappier than
// the soft `ease` used elsewhere, so the transition reads as intentional/
// mechanical rather than dreamy.
const wipeEase = [0.76, 0, 0.24, 1] as const;
const wipeTransition = { duration: 0.55, ease: wipeEase };

// How long the glitch overlay (RGB split + slice tear + scanlines) plays
// at the start of each image transition, in ms.
const GLITCH_DURATION_MS = 420;

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

  // Tracks whether the gallery is moving forward (+1) or backward (-1) so
  // the wipe transition can sweep in the direction that matches the change
  // — left-to-right when advancing, right-to-left when going back, rather
  // than always sweeping the same way regardless of which dot was clicked.
  const directionRef = useRef(1);

  function goToMedia(index: number) {
    directionRef.current = index >= activeMedia ? 1 : -1;
    setActiveMedia(index);
  }

  // Fires the glitch overlay (RGB split / slice tear / scanlines) for a
  // beat every time the active image changes. Skipped on first mount so
  // the page doesn't glitch on load — only actual transitions get it.
  const [glitching, setGlitching] = useState(false);
  const hasMountedGalleryRef = useRef(false);

  useEffect(() => {
    if (!hasMountedGalleryRef.current) {
      hasMountedGalleryRef.current = true;
      return;
    }
    if (gallery[activeMedia]?.type === "video") return;
    setGlitching(true);
    const t = setTimeout(() => setGlitching(false), GLITCH_DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMedia, selectedColor]);

  // Auto-advance through gallery images every 4s — pauses on hover so
  // shoppers can linger, and never auto-advances away from a playing video.
  useEffect(() => {
    if (gallery.length <= 1 || autoplayPaused) return;
    if (gallery[activeMedia]?.type === "video") return;
    const timer = setTimeout(() => {
      directionRef.current = 1;
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

  const dir = directionRef.current;

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
            {/* Hidden SVG filters that isolate the red and cyan channels of
                the duplicated image layers below, used for the RGB-split
                glitch effect. Zero-size so they render nothing themselves. */}
            <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
              <defs>
                <filter id="glitchRedChannel">
                  <feColorMatrix
                    type="matrix"
                    values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                  />
                </filter>
                <filter id="glitchCyanChannel">
                  <feColorMatrix
                    type="matrix"
                    values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
                  />
                </filter>
              </defs>
            </svg>

            <AnimatePresence initial={false}>
              {gallery[activeMedia]?.type === "video" ? (
                <motion.video
                  key={gallery[activeMedia].src}
                  initial={{ clipPath: dir >= 0 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" }}
                  animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
                  exit={{
                    clipPath: dir >= 0 ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)",
                    transition: { duration: 0.35, ease: wipeEase },
                  }}
                  transition={wipeTransition}
                  src={gallery[activeMedia].src}
                  controls
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <motion.div
                  key={gallery[activeMedia]?.src ?? "fallback"}
                  initial={{ clipPath: dir >= 0 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" }}
                  animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
                  exit={{
                    clipPath: dir >= 0 ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)",
                    transition: { duration: 0.35, ease: wipeEase },
                  }}
                  transition={wipeTransition}
                  className="absolute inset-0 overflow-hidden"
                >
                  <Image
                    src={gallery[activeMedia]?.src ?? product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />

                  {glitching && gallery[activeMedia]?.src && (
                    <div className="glitch-overlay" aria-hidden>
                      {/* RGB channel split — two duplicate images, each showing
                          only one color channel, jittering in opposite
                          directions and fading out as the glitch settles. */}
                      <img
                        src={gallery[activeMedia].src}
                        alt=""
                        className="glitch-channel glitch-channel-red"
                      />
                      <img
                        src={gallery[activeMedia].src}
                        alt=""
                        className="glitch-channel glitch-channel-cyan"
                      />

                      {/* Slice tear — thin horizontal bands of the same image
                          punched out and jumped sideways, like a signal drop. */}
                      <div className="glitch-slice glitch-slice-0" style={{ backgroundImage: `url(${gallery[activeMedia].src})` }} />
                      <div className="glitch-slice glitch-slice-1" style={{ backgroundImage: `url(${gallery[activeMedia].src})` }} />
                      <div className="glitch-slice glitch-slice-2" style={{ backgroundImage: `url(${gallery[activeMedia].src})` }} />
                      <div className="glitch-slice glitch-slice-3" style={{ backgroundImage: `url(${gallery[activeMedia].src})` }} />

                      {/* Scanline flicker for a CRT/signal-noise finish. */}
                      <div className="glitch-scanlines" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <style jsx>{`
              .glitch-overlay {
                position: absolute;
                inset: 0;
                pointer-events: none;
              }
              .glitch-channel {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                mix-blend-mode: screen;
                opacity: 0.75;
                will-change: transform, opacity;
              }
              .glitch-channel-red {
                filter: url(#glitchRedChannel);
                animation: glitchShiftRed ${GLITCH_DURATION_MS}ms steps(7, end) forwards;
              }
              .glitch-channel-cyan {
                filter: url(#glitchCyanChannel);
                animation: glitchShiftCyan ${GLITCH_DURATION_MS}ms steps(7, end) forwards;
              }
              @keyframes glitchShiftRed {
                0% { transform: translate3d(0, 0, 0); opacity: 0.85; }
                14% { transform: translate3d(-9px, 2px, 0); }
                28% { transform: translate3d(6px, -3px, 0); }
                42% { transform: translate3d(-5px, 1px, 0); }
                56% { transform: translate3d(3px, 2px, 0); }
                70% { transform: translate3d(-2px, 0, 0); }
                100% { transform: translate3d(0, 0, 0); opacity: 0; }
              }
              @keyframes glitchShiftCyan {
                0% { transform: translate3d(0, 0, 0); opacity: 0.85; }
                14% { transform: translate3d(9px, -2px, 0); }
                28% { transform: translate3d(-6px, 3px, 0); }
                42% { transform: translate3d(5px, -1px, 0); }
                56% { transform: translate3d(-3px, -2px, 0); }
                70% { transform: translate3d(2px, 0, 0); }
                100% { transform: translate3d(0, 0, 0); opacity: 0; }
              }

              .glitch-slice {
                position: absolute;
                left: 0;
                right: 0;
                background-size: cover;
                background-position: center;
                opacity: 0.9;
                will-change: transform, opacity;
              }
              .glitch-slice-0 { top: 8%;  height: 7%;  animation: sliceTear0 ${GLITCH_DURATION_MS}ms steps(6, end) forwards; }
              .glitch-slice-1 { top: 27%; height: 5%;  animation: sliceTear1 ${GLITCH_DURATION_MS}ms steps(6, end) forwards; }
              .glitch-slice-2 { top: 49%; height: 9%;  animation: sliceTear2 ${GLITCH_DURATION_MS}ms steps(6, end) forwards; }
              .glitch-slice-3 { top: 68%; height: 6%;  animation: sliceTear3 ${GLITCH_DURATION_MS}ms steps(6, end) forwards; }
              @keyframes sliceTear0 {
                0% { transform: translateX(0); opacity: 0.9; }
                20% { transform: translateX(18px); }
                45% { transform: translateX(-12px); }
                70% { transform: translateX(6px); }
                100% { transform: translateX(0); opacity: 0; }
              }
              @keyframes sliceTear1 {
                0% { transform: translateX(0); opacity: 0.9; }
                20% { transform: translateX(-22px); }
                45% { transform: translateX(10px); }
                70% { transform: translateX(-5px); }
                100% { transform: translateX(0); opacity: 0; }
              }
              @keyframes sliceTear2 {
                0% { transform: translateX(0); opacity: 0.9; }
                20% { transform: translateX(14px); }
                45% { transform: translateX(-18px); }
                70% { transform: translateX(4px); }
                100% { transform: translateX(0); opacity: 0; }
              }
              @keyframes sliceTear3 {
                0% { transform: translateX(0); opacity: 0.9; }
                20% { transform: translateX(-16px); }
                45% { transform: translateX(9px); }
                70% { transform: translateX(-4px); }
                100% { transform: translateX(0); opacity: 0; }
              }

              .glitch-scanlines {
                position: absolute;
                inset: 0;
                background: repeating-linear-gradient(
                  to bottom,
                  rgba(255, 255, 255, 0.08) 0px,
                  rgba(255, 255, 255, 0.08) 1px,
                  transparent 1px,
                  transparent 3px
                );
                mix-blend-mode: overlay;
                animation: scanlineFlicker ${GLITCH_DURATION_MS}ms steps(5, end) forwards;
              }
              @keyframes scanlineFlicker {
                0% { opacity: 0; }
                15% { opacity: 0.55; }
                35% { opacity: 0.15; }
                55% { opacity: 0.45; }
                80% { opacity: 0.1; }
                100% { opacity: 0; }
              }
            `}</style>

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
                    onClick={() => goToMedia(i)}
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