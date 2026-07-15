export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Legal</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 font-body text-xs text-muted">Last updated: July 2026</p>

      <div className="mt-10 space-y-8 font-body text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">1. Information we collect</h2>
          <p>
            We collect information you provide directly — name, email, shipping address, and order history — along
            with preferences you set in your account, like sizing and favorite categories, so we can tailor
            recommendations to you.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">2. How we use it</h2>
          <p>
            We use your information to process orders, provide customer support, personalize product
            recommendations, and — if you&apos;ve opted in — send you updates about new drops and promotions. We
            never sell your personal information to third parties.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">3. Cookies & local storage</h2>
          <p>
            We use local storage on your device to keep you logged in, remember your cart, and save your
            preferences between visits. You can clear this at any time through your browser settings.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">4. Your choices</h2>
          <p>
            You can update or delete your personal information, adjust notification preferences, or request a copy
            of your data at any time from your Account settings, or by contacting us directly.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">5. Contact</h2>
          <p>Questions about this policy? Reach us at privacy@numen.store.</p>
        </section>
      </div>
    </div>
  );
}