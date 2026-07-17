import type { Metadata } from "next";
import { faqCategories } from "@/src/data/faqContent";
import FaqAccordion from "@/components/faq/FaqAccordion";

export const metadata: Metadata = {
  title: "FAQs — Shipping, Returns, Sizing & Payments | NUMEN.",
  description:
    "Answers to common questions about NUMEN orders: shipping times, cash on delivery, returns and exchanges, size charts, order tracking, payment methods, and product authenticity.",
  keywords: [
    "NUMEN FAQ",
    "clothing store return policy",
    "cash on delivery online shopping",
    "how to track my order",
    "online shopping size chart",
    "is cash on delivery available",
    "affordable streetwear online",
    "original products online store",
    "order cancellation policy",
    "UPI payment online shopping",
  ],
  openGraph: {
    title: "Frequently Asked Questions | NUMEN.",
    description:
      "Everything you need to know about shipping, returns, sizing, payments, and orders at NUMEN.",
    type: "website",
  },
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqCategories.flatMap((category) =>
      category.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      }))
    ),
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="font-mono text-xs uppercase tracking-widest text-accent">Support</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
        Frequently Asked Questions
      </h1>
      <p className="mt-3 max-w-2xl font-body text-sm text-muted">
        Shipping, returns, sizing, payments, and everything else about shopping with NUMEN — answered.
        Can&apos;t find what you need? Our <a href="/contact" className="text-accent hover:underline">support team</a> usually replies within a day.
      </p>

      <FaqAccordion categories={faqCategories} />
    </div>
  );
}