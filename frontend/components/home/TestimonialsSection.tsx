"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Testimonial } from "@/src/lib/reviews";
import { StarRatingDisplay } from "@/components/product/StarRating";

const ease = [0.16, 1, 0.3, 1] as const;

const fallbackTestimonials: Testimonial[] = [
  {
    id: "seed-1",
    authorName: "Priya M.",
    rating: 5,
    comment: "The jackets run true to size and the fabric actually feels premium — not what I expected at this price.",
    productName: "Jackets",
  },
  {
    id: "seed-2",
    authorName: "Devon K.",
    rating: 5,
    comment: "Ordered on a Tuesday, wearing it by Friday. Fastest turnaround I've had from any streetwear brand.",
    productName: "Tracksuits",
  },
  {
    id: "seed-3",
    authorName: "Amara S.",
    rating: 4,
    comment: "Really solid basics. My go-to now for tees — the fit is consistent every single time.",
    productName: "T-Shirts",
  },
];

export default function TestimonialsSection({ testimonials: realTestimonials }: { testimonials: Testimonial[] }) {
  const testimonials = realTestimonials.length >= 3 ? realTestimonials : fallbackTestimonials;

  return (
    <section className="border-y border-white/5 bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease }}
          className="mb-10 text-center"
        >
          <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-accent">Word on the street</span>
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">What customers say</h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease }}
              className="rounded-2xl border border-white/5 bg-bg p-6"
            >
              <Quote size={20} className="text-accent/40" />
              <p className="mt-3 font-body text-sm leading-relaxed text-ink/90">&ldquo;{t.comment}&rdquo;</p>
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                <div>
                  <p className="font-body text-xs font-medium text-ink">{t.authorName}</p>
                  {t.productName && <p className="font-mono text-[10px] text-muted">{t.productName}</p>}
                </div>
                <StarRatingDisplay rating={t.rating} size={12} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}