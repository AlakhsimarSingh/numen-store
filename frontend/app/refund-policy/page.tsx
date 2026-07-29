export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Legal</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">Refund Policy</h1>
      <p className="mt-2 font-body text-xs text-muted">Last updated: July 2026</p>

      <div className="mt-10 space-y-8 font-body text-sm leading-relaxed text-muted">
        <section>
          <p>
            At NUMEN, we take great care to ensure that every product is thoroughly inspected and quality-checked
            before it&apos;s shipped. Please read the following policy carefully before placing an order.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">1. All sales are final</h2>
          <p>We do not offer refunds under any circumstances.</p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">2. No cancellations, returns, or refunds</h2>
          <p>Once an order is placed and confirmed, it cannot be cancelled, returned, or refunded.</p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">3. Shipping and delivery</h2>
          <p>
            We are not responsible for any damage, loss, or issues that occur during shipping or after delivery.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">4. Your responsibility</h2>
          <p>
            It&apos;s your responsibility to provide accurate shipping information at checkout and to receive the
            product upon delivery.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">5. Acknowledgement</h2>
          <p>By placing an order with us, you acknowledge and agree to this Refund Policy.</p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">6. Contact</h2>
          <p>
            Questions or concerns about an order? Reach our support team at{" "}
            <a href="mailto:nmnnumen@gmail.com" className="text-accent hover:underline">nmnnumen@gmail.com</a> or
            call <a href="tel:+917009612811" className="text-accent hover:underline">+91 700 961 2811</a>.
          </p>
        </section>
      </div>
    </div>
  );
}