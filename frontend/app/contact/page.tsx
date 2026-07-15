"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, MapPin, MessageSquare, Phone, Send, User } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { submitContactMessage } from "@/src/lib/contact";
import { CONTACT_TOPICS } from "@/src/lib/contactTopics";

const ease = [0.16, 1, 0.3, 1] as const;

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<string>(CONTACT_TOPICS[0]);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function validate() {
    const next: FormErrors = {};
    if (name.trim().length < 2) next.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (message.trim().length < 10) next.message = "Tell us a bit more (10+ characters).";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await submitContactMessage({ name: name.trim(), email: email.trim(), topic, message: message.trim() });
      setSent(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mb-10 text-center"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Get in touch</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">Contact Us</h1>
        <p className="mx-auto mt-2 max-w-md font-body text-sm text-muted">
          Questions about an order, a fit, or anything else — we usually reply within a day.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.3fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease }}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Mail size={16} />
              </div>
              <div>
                <p className="font-body text-xs text-muted">Email</p>
                <p className="font-body text-sm text-ink">support@numen.store</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Phone size={16} />
              </div>
              <div>
                <p className="font-body text-xs text-muted">Phone</p>
                <p className="font-body text-sm text-ink">+1 (800) 555-0136</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <MapPin size={16} />
              </div>
              <div>
                <p className="font-body text-xs text-muted">Studio</p>
                <p className="font-body text-sm text-ink">Ludhiana, Punjab, India</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <p className="font-body text-xs text-muted">Support hours</p>
            <p className="mt-1 font-body text-sm text-ink">Mon – Sat, 10am – 7pm IST</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease }}
          className="rounded-2xl border border-white/5 bg-surface p-6 sm:p-8"
        >
          {sent ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease }}
              className="flex flex-col items-center py-10 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Send size={24} />
              </div>
              <p className="mt-4 font-body text-sm text-ink">Message sent.</p>
              <p className="mt-1 font-body text-xs text-muted">We&apos;ll get back to you at {email}.</p>
              <button
                onClick={() => {
                  setSent(false);
                  setName("");
                  setEmail("");
                  setMessage("");
                }}
                className="mt-5 font-body text-xs text-accent hover:underline"
              >
                Send another message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">Name</label>
                  <div
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border bg-bg px-4 py-3",
                      errors.name ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
                    )}
                  >
                    <User size={16} className="shrink-0 text-muted" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                    />
                  </div>
                  {errors.name && <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted">Email</label>
                  <div
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border bg-bg px-4 py-3",
                      errors.email ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
                    )}
                  >
                    <Mail size={16} className="shrink-0 text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                    />
                  </div>
                  {errors.email && <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.email}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Topic</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink focus:outline-none focus:border-accent/50"
                >
                  {CONTACT_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Message</label>
                <div
                  className={cn(
                    "flex gap-2.5 rounded-xl border bg-bg px-4 py-3",
                    errors.message ? "border-accent2/60" : "border-white/10 focus-within:border-accent/50"
                  )}
                >
                  <MessageSquare size={16} className="mt-0.5 shrink-0 text-muted" />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help?"
                    rows={4}
                    className="w-full resize-none bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
                  />
                </div>
                {errors.message && <p className="mt-1.5 font-mono text-[11px] text-accent2">{errors.message}</p>}
              </div>

              {submitError && <p className="font-mono text-[11px] text-accent2">{submitError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-8"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Sending…" : "Send Message"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}