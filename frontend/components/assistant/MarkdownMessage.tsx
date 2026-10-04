"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders assistant replies as real formatting (bold, lists, tables, links)
 * instead of raw `**text**` and `| pipes |`. Styled to fit the small chat bubble
 * using the existing design tokens. Raw HTML is NOT enabled (safe by default).
 *
 * Requires: npm i react-markdown remark-gfm
 */
const components: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <p className="mb-1 mt-3 font-display text-sm font-bold text-ink first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mb-1 mt-3 font-display text-sm font-bold text-ink first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mb-1 mt-3 font-display text-sm font-bold text-ink first:mt-0">{children}</p>,
  h4: ({ children }) => <p className="mb-1 mt-3 font-display text-sm font-bold text-ink first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-4 marker:text-accent">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-4 marker:text-accent">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  hr: () => <hr className="my-3 border-white/10" />,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-accent/50 pl-3 text-muted">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[12px] text-accent">{children}</code>
  ),
  img: ({ src, alt }) => {
    if (typeof src !== "string" || !src.startsWith("https://")) return null;
    return (
      <Image
        src={src}
        alt={alt ?? ""}
        width={640}
        height={480}
        unoptimized
        className="my-2 max-h-40 w-full max-w-[240px] rounded-xl object-cover"
      />
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-bg/60 p-3 font-mono text-[12px]">{children}</pre>
  ),
  a: ({ href, children }) => {
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className="text-accent underline underline-offset-2">
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
        {children}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-white/10">
      <table className="w-max min-w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-bg/50">{children}</thead>,
  th: ({ children }) => (
    <th className="whitespace-nowrap px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-t border-white/10 px-3 py-2 align-top">{children}</td>,
};

function MarkdownMessage({ text }: { text: string }) {
  return (
    <div className="break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownMessage);