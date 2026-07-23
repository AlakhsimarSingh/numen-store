import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { computeStock, generateSeoFields, generateUniqueSlug, serializeProduct } from "@/lib/products/products";

// Defensive headroom on top of client-side batching (see BATCH_SIZE in the
// bulk-import page). Each request now only creates a chunk of products, not
// the whole import, but this still gives slower chunks (e.g. many rows with
// colliding names needing several generateUniqueSlug lookups) more room
// before a platform-level timeout. Only takes effect on runtimes that
// support Next.js route segment config (e.g. Vercel) — has no effect
// elsewhere. Note: Vercel's Hobby plan hard-caps at 10s regardless of this
// value; Pro/Enterprise honor it up to their plan's ceiling.
export const maxDuration = 60;

// Self-imposed deadline, comfortably under `maxDuration`. If the loop is
// still running past this point, we stop processing further rows and
// return a normal, valid JSON response describing exactly what did and
// didn't get attempted — instead of letting the platform kill the function
// mid-loop, which returns a non-JSON crash/timeout page and leaves the
// client unable to tell which of the already-created rows (if any)
// actually made it in. This is what makes "some products got created
// despite the request showing as failed" stop being possible for this
// specific failure mode: the function now always finishes cleanly, on
// its own terms, well before the platform would force it to stop.
const SOFT_DEADLINE_MS = 50_000;

interface BulkRow {
  name?: string;
  categorySlug?: string;
  price?: number | string;
  compareAtPrice?: number | string;
  image?: string;
  images?: string[];
  stock?: number | string;
  sizes?: string[];
  isNew?: boolean;
  isSpotlight?: boolean;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rows: BulkRow[] = Array.isArray(body?.products) ? body.products : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No products provided." }, { status: 400 });
  }
  if (rows.length > 1000) {
    return NextResponse.json({ error: "Max 1000 products per import — split into smaller batches." }, { status: 400 });
  }

  // Fetch every referenced category once, instead of per-row, to keep a
  // 700-row import from firing 700 separate lookups. Also gives us
  // category.name for SEO description/keyword generation without an
  // extra query per row.
  const categorySlugs = [...new Set(rows.map((r) => r.categorySlug).filter(Boolean))] as string[];
  const categories = await prisma.category.findMany({ where: { slug: { in: categorySlugs } } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const created: ReturnType<typeof serializeProduct>[] = [];
  const errors: { index: number; name?: string; error: string }[] = [];
  const startedAt = Date.now();

  // Sequential, not a single all-or-nothing transaction — with hundreds of
  // rows, one bad row shouldn't wipe out everything else that validated
  // fine. Each row either succeeds or reports its own error.
  for (let i = 0; i < rows.length; i++) {
    if (Date.now() - startedAt > SOFT_DEADLINE_MS) {
      // Running out of our self-imposed budget — stop attempting new rows
      // and report the rest as explicitly not-attempted (distinct from an
      // actual validation/DB failure) so the client's retry story is
      // unambiguous: these specific rows are safe to resubmit as-is.
      for (let j = i; j < rows.length; j++) {
        errors.push({ index: j, name: rows[j].name, error: "Not attempted — batch ran out of time. Safe to retry this row." });
      }
      break;
    }

    const row = rows[i];
    try {
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const categorySlug = typeof row.categorySlug === "string" ? row.categorySlug.trim() : "";
      const image = typeof row.image === "string" ? row.image.trim() : "";
      const priceNum = Number(row.price);

      if (!name) throw new Error("Name is required.");
      const category = categoryBySlug.get(categorySlug);
      if (!category) throw new Error(`Category "${categorySlug}" not found.`);
      if (!image) throw new Error("Main image is required.");
      if (!Number.isFinite(priceNum) || priceNum < 0) throw new Error("Price must be a non-negative number.");

      let compareAtPrice: number | undefined;
      if (row.compareAtPrice !== undefined && row.compareAtPrice !== null && row.compareAtPrice !== "") {
        const n = Number(row.compareAtPrice);
        if (Number.isFinite(n) && n >= 0) compareAtPrice = n;
      }

      const images = Array.isArray(row.images) ? row.images.filter((s) => typeof s === "string") : [];
      const sizes = Array.isArray(row.sizes) ? row.sizes.filter((s) => typeof s === "string" && s.trim()) : [];
      const stock = computeStock({ stock: Number(row.stock) || 0, sizes });
      const slug = await generateUniqueSlug(name);

      const isNew = Boolean(row.isNew);
      const isSpotlight = Boolean(row.isSpotlight);
      const seo = generateSeoFields({
        name,
        categoryName: category.name,
        price: priceNum,
        isNew,
        isSpotlight,
      });

      const product = await prisma.product.create({
        data: {
          slug,
          name,
          categorySlug,
          price: priceNum,
          compareAtPrice,
          image,
          images,
          stock,
          sizes,
          isNew,
          isSpotlight,
          metaTitle: seo.metaTitle,
          metaDescription: seo.metaDescription,
          keywords: seo.keywords,
        },
      });

      created.push(serializeProduct(product));
    } catch (err) {
      errors.push({ index: i, name: row.name, error: err instanceof Error ? err.message : "Failed to create product." });
    }
  }

  return NextResponse.json({ created, errors, createdCount: created.length, errorCount: errors.length });
}