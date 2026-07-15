/**
 * Flips existing CurrencyRate rows from "1 INR = X <code>" (tiny decimals)
 * to "1 <code> = X INR" (natural numbers), and seeds a starter symbol for
 * each — you can correct any of these afterward in the admin panel.
 *
 *   npx tsx scripts/flip-currency-rate-and-add-symbol.ts --dry-run
 *   npx tsx scripts/flip-currency-rate-and-add-symbol.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const dryRun = process.argv.includes("--dry-run");

const STARTER_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", AED: "AED", CAD: "$", AUD: "$", SGD: "$", JPY: "¥",
};

async function main() {
  const rows = await prisma.currencyRate.findMany();
  console.log(`${dryRun ? "[DRY RUN] " : ""}Found ${rows.length} currency row(s).\n`);

  for (const row of rows) {
    if (row.rate <= 0) {
      console.log(`Skipping ${row.code}: rate is ${row.rate}, can't invert.`);
      continue;
    }
    const newRate = 1 / row.rate;
    const symbol = STARTER_SYMBOLS[row.code] ?? row.code;
    console.log(`${row.code}: ${row.rate} -> ${newRate.toFixed(4)}   symbol: "${symbol}"`);
    if (!dryRun) {
      await prisma.currencyRate.update({ where: { code: row.code }, data: { rate: newRate, symbol } });
    }
  }

  console.log(dryRun ? "\nDry run only — nothing written." : "\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());