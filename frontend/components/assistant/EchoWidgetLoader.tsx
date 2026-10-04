"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Separate chunk (framer-motion UI + react-markdown + remark-gfm) that is NOT
// part of the initial JS and never competes with hero / LCP work.
const EchoWidget = dynamic(() => import("./EchoWidget"), { ssr: false });

export default function EchoWidgetLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = () => setReady(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(start, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(start, 2000);
    return () => clearTimeout(t);
  }, []);

  return ready ? <EchoWidget /> : null;
}