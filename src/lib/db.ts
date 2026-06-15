import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Ensure DATABASE_URL is always set for SQLite
  // This prevents the "URL must start with file:" error
  const datasourceUrl = process.env.DATABASE_URL || 'file:/home/z/my-project/db/custom.db'

  return new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
