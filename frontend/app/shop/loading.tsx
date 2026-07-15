export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8 h-4 w-24 animate-pulse rounded bg-surface2" />
      <div className="mb-8 h-9 w-56 animate-pulse rounded bg-surface2" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-surface p-3">
            <div className="aspect-[3/4] animate-pulse rounded-xl bg-surface2" />
            <div className="mt-3 h-3.5 w-3/4 animate-pulse rounded bg-surface2" />
            <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-surface2" />
          </div>
        ))}
      </div>
    </div>
  );
}
