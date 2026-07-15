export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-6 h-3 w-40 animate-pulse rounded bg-surface2" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="aspect-[3/4] animate-pulse rounded-3xl bg-surface2" />
        <div className="space-y-4">
          <div className="h-3 w-24 animate-pulse rounded bg-surface2" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-surface2" />
          <div className="h-4 w-32 animate-pulse rounded bg-surface2" />
          <div className="h-7 w-28 animate-pulse rounded bg-surface2" />
          <div className="h-16 w-full animate-pulse rounded bg-surface2" />
          <div className="h-12 w-full animate-pulse rounded-full bg-surface2" />
        </div>
      </div>
    </div>
  );
}