export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center gap-5">
        <div className="h-16 w-16 animate-pulse rounded-full bg-surface2" />
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-surface2" />
          <div className="h-3.5 w-56 animate-pulse rounded bg-surface2" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-full animate-pulse rounded-xl bg-surface2" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface2" />
          ))}
        </div>
      </div>
    </div>
  );
}