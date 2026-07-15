"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, Home, Search } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent"
      >
        <Compass size={28} />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease }}
        className="mt-6 font-mono text-sm text-accent"
      >
        404
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease }}
        className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl"
      >
        This drop doesn&apos;t exist.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease }}
        className="mt-2 font-body text-sm text-muted"
      >
        The page you&apos;re looking for got lost between drops. Let&apos;s get you back on track.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease }}
        className="mt-8 flex flex-wrap justify-center gap-4"
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-105"
        >
          <Home size={15} /> Back Home
        </Link>
        <Link
          href="/shop"
          className="flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-body text-sm font-semibold text-ink transition-colors hover:border-accent/50 hover:text-accent"
        >
          <Search size={15} /> Browse Shop
        </Link>
      </motion.div>
    </div>
  );
}