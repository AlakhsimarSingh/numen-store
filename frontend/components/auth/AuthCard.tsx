"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ReactNode } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight text-ink">
            NUMEN<span className="text-accent">.</span>
          </Link>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 font-body text-sm text-muted">{subtitle}</p>}
        </div>

        <div className="rounded-2xl border border-white/5 bg-surface p-6 sm:p-8">{children}</div>

        {footer && <div className="mt-6 text-center font-body text-sm text-muted">{footer}</div>}
      </motion.div>
    </div>
  );
}