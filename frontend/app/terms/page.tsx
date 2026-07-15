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
            listed in USD unless otherwise noted and are subject to change without notice prior to purchase
            confirmation.
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
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">3. Returns & exchanges</h2>
          <p>
            Items may be returned or exchanged within 30 days of delivery, provided they are unworn and have original
            tags attached. Refunds are issued to the original payment method once the return is received and
            inspected.
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
      </div>
    </div>
  );
}