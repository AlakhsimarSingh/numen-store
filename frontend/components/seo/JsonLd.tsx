// Renders a <script type="application/ld+json"> tag from a plain object.
// Server-renderable (no "use client" needed) so structured data is present
// in the initial HTML rather than injected after hydration — the more
// reliable path for crawlers to pick it up.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    // eslint-disable-next-line react/no-danger -- JSON.stringify output only, not user-supplied HTML
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}