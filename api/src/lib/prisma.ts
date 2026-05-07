import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL } from "../config/env";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function normalizeDbUrl(url: string): string {
  if (process.env.NODE_ENV !== "production") return url;
  const u = new URL(url);
  if (!u.searchParams.has("sslmode")) {
    u.searchParams.set("sslmode", "verify-full");
  } else if (u.searchParams.get("sslmode") === "require") {
    u.searchParams.set("sslmode", "verify-full");
  }
  return u.toString();
}

function createPrismaClient(): PrismaClient {
  const connectionString = normalizeDbUrl(DATABASE_URL);
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
