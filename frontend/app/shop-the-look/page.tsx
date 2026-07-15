import LookSection from "@/components/looks/LookSection";
import { Look } from "@/src/types";

async function fetchLooksForServer(): Promise<Look[]> {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
  try {
    const res = await fetch(`${backendUrl}/api/looks`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function ShopTheLookPage() {
  const looks = await fetchLooksForServer();

  return (
    <div className="pt-10">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Curated</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink sm:text-5xl">Shop The Look</h1>
        <p className="mt-3 font-body text-sm text-muted">
          Full fits, put together — tap any piece to shop it, or grab the whole look in one go.
        </p>
      </div>

      {looks.length === 0 ? (
        <p className="mx-auto mt-16 max-w-md px-6 text-center font-body text-sm text-muted">
          No looks published yet — check back soon.
        </p>
      ) : (
        looks.map((look) => <LookSection key={look.id} look={look} />)
      )}
    </div>
  );
}