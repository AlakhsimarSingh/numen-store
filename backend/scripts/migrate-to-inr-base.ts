/**
 * One-time migration: flips the store's base currency from USD to INR.
 *
 * What this script does:
 *  1. Reads the old "1 USD = X INR" rate (default 86.0, override with --usd-rate=NN)
 *  2. Multiplies every Product.price / compareAtPrice by that rate
 *  3. Multiplies SiteSettings.shippingFee / freeShippingThreshold / codFee by that rate
 *  4. Seeds CurrencyRate with "1 INR = X" rows for USD, EUR, GBP
 *
 * ALWAYS run with --dry-run first:
 *
 *   npx tsx scripts/migrate-to-inr-base.ts --dry-run
 *   npx tsx scripts/migrate-to-inr-base.ts
 *   npx tsx scripts/migrate-to-inr-base.ts --usd-rate=86
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const rateArg = args.find((a) => a.startsWith("--usd-rate="));

// Exchange rate used to convert all existing USD prices to INR.
// Override from CLI if desired.
const USD_TO_INR = rateArg ? Number(rateArg.split("=")[1]) : 86;

// Cross-rates used for seeding CurrencyRate.
// These are approximate current values.
const USD_PER_INR = 1 / USD_TO_INR;
const EUR_PER_USD = 0.85;
const GBP_PER_USD = 0.74;

if (!Number.isFinite(USD_TO_INR) || USD_TO_INR <= 0) {
  console.error("Invalid --usd-rate value.");
  process.exit(1);
}

async function main() {
  console.log(
    `${dryRun ? "[DRY RUN] " : ""}Using 1 USD = ${USD_TO_INR} INR\n`
  );

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      compareAtPrice: true,
    },
  });

  console.log(`Products to convert: ${products.length}`);

  for (const p of products.slice(0, 5)) {
    console.log(
      `  ${p.name}: $${p.price} -> ₹${(
        Number(p.price) * USD_TO_INR
      ).toFixed(2)}`
    );
  }

  if (products.length > 5) {
    console.log(`  …and ${products.length - 5} more`);
  }

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 1 },
  });

  if (settings) {
    console.log("\nSiteSettings:");
    console.log(
      `  shippingFee: $${settings.shippingFee} -> ₹${(
        Number(settings.shippingFee) * USD_TO_INR
      ).toFixed(2)}`
    );
    console.log(
      `  freeShippingThreshold: $${settings.freeShippingThreshold} -> ₹${(
        Number(settings.freeShippingThreshold) * USD_TO_INR
      ).toFixed(2)}`
    );
    console.log(
      `  codFee: $${settings.codFee} -> ₹${(
        Number(settings.codFee) * USD_TO_INR
      ).toFixed(2)}`
    );
  }

  // Store rates as: 1 INR = X Currency
  const newRates = {
    USD: USD_PER_INR,
    EUR: EUR_PER_USD * USD_PER_INR,
    GBP: GBP_PER_USD * USD_PER_INR,
  };

  console.log("\nCurrencyRate rows to seed (1 INR = X):");
  console.table(newRates);

  if (dryRun) {
    console.log(
      "\nDry run completed. No changes were written to the database."
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Update products
    for (const p of products) {
      await tx.product.update({
        where: { id: p.id },
        data: {
          price: Number(p.price) * USD_TO_INR,
          compareAtPrice:
            p.compareAtPrice != null
              ? Number(p.compareAtPrice) * USD_TO_INR
              : null,
        },
      });
    }

    // Update store settings
    if (settings) {
      await tx.siteSettings.update({
        where: { id: 1 },
        data: {
          shippingFee: Number(settings.shippingFee) * USD_TO_INR,
          freeShippingThreshold:
            Number(settings.freeShippingThreshold) * USD_TO_INR,
          codFee: Number(settings.codFee) * USD_TO_INR,
        },
      });
    }

    // Seed/update currency rates
    for (const [code, rate] of Object.entries(newRates)) {
      await tx.currencyRate.upsert({
        where: { code },
        create: {
          code,
          rate,
        },
        update: {
          rate,
        },
      });
    }
  });

  console.log("\n✅ Migration completed successfully.");
  console.log("• Product prices converted to INR.");
  console.log("• Shipping/COD settings converted to INR.");
  console.log("• CurrencyRate table updated.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });