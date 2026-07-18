import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { writeFileSync } from "fs";
import { join } from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const dryRun = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Slug generation — mirrors src/lib/products/products.ts exactly, so
// backfilled slugs are indistinguishable from ones the live API produces.
// ---------------------------------------------------------------------------

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateUniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "product";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (
    await prisma.product.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

// ---------------------------------------------------------------------------
// SEO field generation — mirrors src/lib/products/products.ts exactly.
// ---------------------------------------------------------------------------

const SITE_NAME = "NUMEN";
const MAX_META_TITLE = 60;
const MAX_META_DESCRIPTION = 160;
const MAX_KEYWORDS = 15;
const STOPWORDS = new Set(["the", "and", "with", "for", "from", "this", "that", "your", "our"]);

function truncateAtWordBoundary(str: string, max: number) {
  if (str.length <= max) return str;
  const cut = str.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

function generateSeoFields(input: {
  name: string;
  categoryName?: string | null;
  price: number;
  isNew?: boolean;
  isSpotlight?: boolean;
}) {
  const category = input.categoryName?.trim() || undefined;

  const titleParts = [input.name, category, SITE_NAME].filter(Boolean) as string[];
  const metaTitle = truncateAtWordBoundary(titleParts.join(" | "), MAX_META_TITLE);

  const priceText = Number.isFinite(input.price)
    ? `₹${Math.round(input.price).toLocaleString("en-IN")}`
    : undefined;

  const descBits = [
    `Shop ${input.name}`,
    category ? `from our ${category} collection` : null,
    priceText ? `at ${priceText}.` : ".",
    input.isNew ? "New arrival." : null,
    input.isSpotlight ? "Featured pick." : null,
    `Premium streetwear from ${SITE_NAME} — fast shipping, easy returns.`,
  ].filter(Boolean);
  const metaDescription = truncateAtWordBoundary(descBits.join(" ").replace(/\s+/g, " "), MAX_META_DESCRIPTION);

  const keywordSet = new Set<string>();
  const addWords = (text: string) => {
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      .forEach((w) => keywordSet.add(w));
  };
  addWords(input.name);
  keywordSet.add(input.name.toLowerCase().trim());
  if (category) {
    addWords(category);
    keywordSet.add(category.toLowerCase());
  }
  keywordSet.add(SITE_NAME.toLowerCase());
  keywordSet.add("streetwear");
  if (input.isNew) keywordSet.add("new arrival");
  if (input.isSpotlight) keywordSet.add("featured");

  return {
    metaTitle,
    metaDescription,
    keywords: Array.from(keywordSet).slice(0, MAX_KEYWORDS),
  };
}

// ---------------------------------------------------------------------------
// Backfill
// ---------------------------------------------------------------------------

async function main() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" }, // stable order so re-runs produce identical dedupe suffixes
    include: { category: true },
  });

  console.log(`Found ${products.length} products.${dryRun ? " (dry run — no writes will be made)" : ""}`);

  const slugChanges: { id: string; name: string; oldSlug: string; newSlug: string }[] = [];
  let processed = 0;

  for (const p of products) {
    const newSlug = await generateUniqueSlug(p.name, p.id);
    const seo = generateSeoFields({
      name: p.name,
      categoryName: p.category?.name,
      price: Number(p.price),
      isNew: p.isNew,
      isSpotlight: p.isSpotlight,
    });

    if (newSlug !== p.slug) {
      slugChanges.push({ id: p.id, name: p.name, oldSlug: p.slug, newSlug });
    }

    if (dryRun) {
      console.log(`[dry run] would update: ${p.name} — slug: ${p.slug} → ${newSlug}`);
    } else {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          slug: newSlug,
          metaTitle: seo.metaTitle,
          metaDescription: seo.metaDescription,
          keywords: seo.keywords,
        },
      });
    }

    processed++;
    if (!dryRun && processed % 25 === 0) console.log(`  ${processed}/${products.length}…`);
  }

  console.log(`\nDone. Processed ${processed}/${products.length}. ${slugChanges.length} slug(s) changed.`);

  if (slugChanges.length > 0) {
    const logPath = join(process.cwd(), "slug-migration-log.json");
    writeFileSync(logPath, JSON.stringify(slugChanges, null, 2));
    console.log(`Slug changes written to ${logPath} — use this to set up 301 redirects for the old URLs.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());