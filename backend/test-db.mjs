import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

console.log("Connection string:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

try {
  const result = await prisma.$queryRaw`SELECT 1 as test`;
  console.log("SUCCESS:", result);
} catch (err) {
  console.error("FAILED:", err.message);
} finally {
  await prisma.$disconnect();
}