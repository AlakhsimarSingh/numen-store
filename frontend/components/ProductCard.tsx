"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import { Product } from "@/src/types";
import { formatPrice, cn } from "@/src/lib/utils";
import { useCartStore } from "@/src/hooks/useCartStore";
import { useWishlistStore } from "@/src/hooks/useWishlistStore";
import { useToastStore } from "@/src/hooks/useToastStore";
import { useProductPrice } from "@/src/hooks/useProductPrice";
export default function ProductCard({ product }: { product: Product }) {
  const ref = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);
  const wishlisted = useWishlistStore((s) => s.has(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });
  const showToast = useToastStore((s) => s.show);
  const { formattedPrice, formattedCompareAt, estimated } = useProductPrice(product);
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const lowStock = product.stock > 0 && product.stock <= 5;
  const outOfStock = product.stock === 0;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className="group relative rounded-2xl border border-white/5 bg-surface p-3"
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface2">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          <div className="absolute left-2 top-2 flex flex-col gap-1.5">
            {product.isNew && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-bg">
                New
              </span>
            )}
            {product.compareAtPrice && (
              <span className="rounded-full bg-accent2 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
                Sale
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist(product.id);
              showToast(wishlisted ? "Removed from wishlist" : "Added to wishlist", wishlisted ? "info" : "success");
            }}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-bg/70 backdrop-blur-sm transition-colors hover:bg-bg/90"
          >
            <Heart
              size={15}
              className={cn("transition-colors", wishlisted ? "fill-accent2 text-accent2" : "text-ink/80")}
            />
          </button>

          {(lowStock || outOfStock) && (
            <span className="absolute bottom-2 left-2 rounded-full bg-bg/80 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted backdrop-blur-sm">
              {outOfStock ? "Sold out" : `Only ${product.stock} left`}
            </span>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              addItem(product);
              showToast(`${product.name} added to cart`);
            }}
            disabled={outOfStock}
            aria-label="Quick add to cart"
            className={cn(
              "absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-bg opacity-0 transition-all duration-300 group-hover:opacity-100",
              "translate-y-2 group-hover:translate-y-0",
              outOfStock && "cursor-not-allowed opacity-30"
            )}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-3 flex items-start justify-between gap-2 px-1">
          <div>
            <h3 className="font-body text-sm text-ink">{product.name}</h3>
            <div className="mt-1 flex items-center gap-2 font-mono text-xs">
              <span className="text-ink">
                {estimated && <span className="text-muted">~</span>}
                {formattedPrice}
              </span>
              {formattedCompareAt && <span className="text-muted line-through">{formattedCompareAt}</span>}
            </div>
          </div>
          <span className="mt-0.5 font-mono text-xs text-muted">★ {product.rating}</span>
        </div>
      </Link>
    </motion.div>
  );
}