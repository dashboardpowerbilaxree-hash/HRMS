import { PrismaClient } from '@prisma/client'

// CRITICAL: Ensure DATABASE_URL is set BEFORE PrismaClient is instantiated.
// Prisma reads the URL from the env variable referenced in schema.prisma (env("DATABASE_URL")).
// If this variable is missing or empty at runtime, Prisma throws:
//   "the URL must start with the protocol `file:`"
const SQLITE_URL = 'file:/home/z/my-project/db/custom.db'
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('file:')) {
  process.env.DATABASE_URL = SQLITE_URL
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
