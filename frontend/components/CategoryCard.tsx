"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { iconOptions, iconNames } from "@/src/lib/iconMap";
import type { Category } from "@/src/lib/categories";

export default function CategoryCard({ category }: { category: Category }) {
  const Icon = iconOptions[category.iconName] ?? iconOptions[iconNames[0]];

  return (
    <Link
      href={`/shop/${category.slug}`}
      className="group relative isolate block aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-surface2 shadow-lg transition-transform duration-500 hover:-translate-y-1 hover:shadow-2xl"
    >
      {category.previewImage ? (
        <Image
          src={category.previewImage}
          alt={category.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-surface2">
          <Icon size={48} strokeWidth={1} className="text-muted/70" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/5 transition-colors duration-500 group-hover:from-black/90" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/65">
              {category.productCount} {category.productCount === 1 ? "item" : "items"}
            </p>
            <h3 className="mt-1 truncate font-display text-xl font-bold text-white sm:text-2xl">
              {category.name}
            </h3>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-sm transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-bg">
            <ArrowUpRight size={17} />
          </span>
        </div>
      </div>
    </Link>
  );
}
