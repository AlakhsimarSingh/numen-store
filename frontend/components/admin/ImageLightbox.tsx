"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";

export default function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-bg/95 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink hover:text-accent2"
      >
        <X size={20} />
      </button>
      <div className="relative h-full max-h-[85vh] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <Image src={src} alt={alt} fill sizes="90vw" className="object-contain" />
      </div>
    </div>
  );
}