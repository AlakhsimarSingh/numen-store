import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const dryRun = process.argv.includes("--dry-run");
const categories = [
  { slug: "bags", name: "Bags", iconName: "Backpack" },
  { slug: "belts", name: "Belts", iconName: "Package" },
  { slug: "caps", name: "Caps", iconName: "HardHat" },
  { slug: "cargo-pants", name: "Cargo Pants", iconName: "Layers" },
  { slug: "face-mask", name: "Face Mask", iconName: "Wind" },
  { slug: "formal-shoes", name: "Formal Shoes", iconName: "Footprints" },
  { slug: "girls-heels", name: "Girls Heels", iconName: "Sparkles" },
  { slug: "jackets", name: "Jackets", iconName: "Shirt" },
  { slug: "jeans", name: "Jeans", iconName: "Layers" },
  { slug: "ladies-bags", name: "Ladies Bags", iconName: "ShoppingBag" },
  { slug: "lowers", name: "Lowers", iconName: "Layers" },
  { slug: "outfits", name: "Outfits", iconName: "Star" },
  { slug: "pants", name: "Pants", iconName: "Layers" },
  { slug: "perfumes", name: "Perfumes & Deos", iconName: "Droplet" },
  { slug: "pullovers", name: "Pullovers", iconName: "Shirt" },
  { slug: "sandos", name: "Sandos / Tank Tops", iconName: "Shirt" },
  { slug: "shades", name: "Shades", iconName: "Glasses" },
  { slug: "shirts", name: "Shirts", iconName: "Shirt" },
  { slug: "shoes", name: "Shoes", iconName: "Footprints" },
  { slug: "shorts", name: "Shorts", iconName: "Shirt" },
  { slug: "slippers", name: "Slippers", iconName: "Footprints" },
  { slug: "socks", name: "Socks", iconName: "Footprints" },
  { slug: "tie", name: "Tie", iconName: "Award" },
  { slug: "tracksuits", name: "Tracksuits", iconName: "Shirt" },
  { slug: "tshirts", name: "T-Shirts", iconName: "Shirt" },
  { slug: "wallets", name: "Wallets", iconName: "Wallet" },
  { slug: "watches", name: "Watches", iconName: "Watch" },
];
async function main() {
  for (const cat of categories) {
    if (dryRun) {
      console.log(`[dry run] would upsert: ${cat.slug}`);
      continue;
    }
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, iconName: cat.iconName },
      create: cat,
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());