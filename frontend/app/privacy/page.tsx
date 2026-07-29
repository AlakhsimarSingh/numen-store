export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Legal</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 font-body text-xs text-muted">Last updated: July 2026</p>

      <div className="mt-10 space-y-8 font-body text-sm leading-relaxed text-muted">
        <section>
          <p>
            NUMEN (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates this website and the related
            services that let you browse, purchase, and manage orders with us (the &ldquo;Services&rdquo;). This
            Privacy Policy describes how we collect, use, and disclose your personal information when you visit,
            use, or make a purchase through the Services, or otherwise communicate with us.
          </p>
          <p className="mt-3">
            Please read this Privacy Policy carefully. By using the Services, you acknowledge that you have read
            this Privacy Policy and understand how we collect, use, and disclose your information as described
            below.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">1. Personal information we collect</h2>
          <p>
            &ldquo;Personal information&rdquo; means information that identifies or can reasonably be linked to
            you. Depending on how you interact with us, we may collect:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li><span className="text-ink/80">Contact details</span> — name, billing and shipping address, phone number, and email address.</li>
            <li><span className="text-ink/80">Payment information</span> — processed securely through our payment partner (Razorpay); we do not store your full card number, CVV, or UPI PIN on our own servers.</li>
            <li><span className="text-ink/80">Account information</span> — username, password, saved sizing preferences, and favorite categories.</li>
            <li><span className="text-ink/80">Transaction information</span> — items you view, add to cart, wishlist, purchase, or return, and your order history.</li>
            <li><span className="text-ink/80">Communications</span> — anything you send us, such as a customer support message or a review.</li>
            <li><span className="text-ink/80">Device and usage information</span> — IP address, browser type, and how you interact with the Services.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">2. Where this information comes from</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Directly from you — creating an account, placing an order, or contacting us.</li>
            <li>Automatically — through your device and browser as you use the Services, including cookies and similar technologies.</li>
            <li>From service providers who process information on our behalf (see Section 4).</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">3. How we use your information</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><span className="text-ink/80">Providing the Services</span> — processing payments, fulfilling and shipping orders, managing your account, and handling returns under our Refund Policy.</li>
            <li><span className="text-ink/80">Personalization</span> — remembering your preferences and recommending products you might like.</li>
            <li><span className="text-ink/80">Marketing</span> — sending updates about new drops and promotions, only if you&apos;ve opted in; you can opt out at any time.</li>
            <li><span className="text-ink/80">Security and fraud prevention</span> — authenticating your account and protecting the Services from misuse.</li>
            <li><span className="text-ink/80">Support</span> — responding to your questions and requests.</li>
            <li><span className="text-ink/80">Legal compliance</span> — meeting our obligations under applicable law.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">4. How we disclose information</h2>
          <p>We disclose personal information only in the following circumstances:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>
              <span className="text-ink/80">Service providers</span> who perform functions on our behalf — for
              example, payment processing (Razorpay), cloud hosting and storage (such as Vercel and Supabase),
              order fulfillment and shipping, and customer support tooling.
            </li>
            <li>
              <span className="text-ink/80">Marketing partners</span>, only where you&apos;ve consented to receive
              marketing, and only to deliver that marketing.
            </li>
            <li>
              <span className="text-ink/80">Legal and safety reasons</span> — to comply with applicable law,
              respond to valid legal requests, or protect the rights, property, and safety of NUMEN, our customers,
              or others.
            </li>
            <li>
              <span className="text-ink/80">Business transfers</span> — in connection with a merger, acquisition,
              or sale of assets, subject to standard confidentiality protections.
            </li>
          </ul>
          <p className="mt-3">We do not sell your personal information.</p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">5. Third-party websites and links</h2>
          <p>
            The Services may link to websites or platforms we don&apos;t operate or control, including our social
            media pages. We aren&apos;t responsible for the privacy practices of those third parties — review their
            own policies before providing information to them.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">6. Children&apos;s data</h2>
          <p>
            The Services aren&apos;t intended for children, and we don&apos;t knowingly collect personal
            information from children under the age of majority in their jurisdiction. If you&apos;re a parent or
            guardian and believe your child has provided us with personal information, contact us using the details
            below and we&apos;ll delete it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">7. Security and retention</h2>
          <p>
            We take reasonable measures to protect your personal information, but no method of transmission or
            storage is completely secure, and we can&apos;t guarantee absolute security. We retain your information
            for as long as needed to provide the Services, comply with legal obligations, resolve disputes, and
            enforce our agreements.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">8. Your rights and choices</h2>
          <p>Depending on where you live, you may have the right to:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Access the personal information we hold about you.</li>
            <li>Correct inaccurate personal information.</li>
            <li>Request deletion of your personal information.</li>
            <li>Receive a copy of your data in a portable format.</li>
            <li>Opt out of marketing communications at any time via the unsubscribe link in our emails.</li>
          </ul>
          <p className="mt-3">
            You can exercise most of these directly from your Account settings, or by contacting us using the
            details below. We may need to verify your identity before acting on a request.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">9. Complaints</h2>
          <p>
            If you have concerns about how we handle your personal information, contact us using the details below.
            Depending on where you live, you may also have the right to lodge a complaint with your local data
            protection authority.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">10. International transfers</h2>
          <p>
            We&apos;re based in India, and the service providers we use to operate the Services may process or
            store information outside the country you live in. Where required, we rely on recognized safeguards for
            any such transfer.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">11. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices or for legal,
            operational, or regulatory reasons. We&apos;ll post the revised policy here and update the &ldquo;Last
            updated&rdquo; date above.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">12. Contact</h2>
          <p>
            Questions about this Privacy Policy, or want to exercise any of the rights above? Reach us at{" "}
            <a href="mailto:nmnnumen@gmail.com" className="text-accent hover:underline">nmnnumen@gmail.com</a>,
            call <a href="tel:+917009612811" className="text-accent hover:underline">+91 700 961 2811</a>, or write
            to us at NUMEN, Jalandhar, 144009, Punjab, India.
          </p>
        </section>
      </div>
    </div>
  );
}