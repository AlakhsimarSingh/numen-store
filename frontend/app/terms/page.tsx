import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Legal</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 font-body text-xs text-muted">Last updated: July 2026</p>

      <div className="mt-10 space-y-8 font-body text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">1. Orders & payment</h2>
          <p>
            By placing an order, you confirm the shipping and payment details provided are accurate. Prices are
            listed in Indian Rupees (₹) unless a regional price has been set for your currency, and are subject to
            change without notice prior to purchase confirmation. We accept payment by card, UPI, and Cash on
            Delivery where available; card and UPI payments are processed securely through our payment partner,
            Razorpay.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">2. Shipping</h2>
          <p>
            Estimated delivery windows are provided at checkout and are not guaranteed. We are not responsible for
            delays caused by carriers or events outside our control.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">3. Returns & refunds</h2>
          <p>
            All sales are final. We do not offer cancellations, returns, or refunds once an order has been placed
            and confirmed. See our{" "}
            <Link href="/refund-policy" className="text-accent hover:underline">Refund Policy</Link>{" "}
            for full details.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">4. Account responsibilities</h2>
          <p>
            You&apos;re responsible for maintaining the confidentiality of your account credentials and for all
            activity under your account.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">5. Changes to these terms</h2>
          <p>
            We may update these terms occasionally. Continued use of the site after changes constitutes acceptance
            of the updated terms.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">6. Contact</h2>
          <p>
            Questions about these terms? Reach us at{" "}
            <a href="mailto:nmnnumen@gmail.com" className="text-accent hover:underline">nmnnumen@gmail.com</a> or
            call <a href="tel:+917009612811" className="text-accent hover:underline">+91 700 961 2811</a>.
          </p>
        </section>
      </div>
    </div>
  );
}