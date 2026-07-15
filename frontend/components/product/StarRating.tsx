"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function StarRatingDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={cn(star <= Math.round(rating) ? "fill-accent text-accent" : "text-white/15")}
        />
      ))}
    </div>
  );
}

export function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          aria-label={`Rate ${star} stars`}
        >
          <Star
            size={26}
            className={cn(
              "transition-colors",
              star <= (hover || value) ? "fill-accent text-accent" : "text-white/15"
            )}
          />
        </button>
      ))}
    </div>
  );
}