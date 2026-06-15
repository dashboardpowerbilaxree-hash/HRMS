import { PrismaClient } from '@prisma/client'

/**
 * Database initialization for Laxree HRMS
 * 
 * Supports two database backends (auto-detected from DATABASE_URL):
 * 1. SQLite (local):  DATABASE_URL starts with "file:"
 * 2. PostgreSQL/Neon (Vercel): DATABASE_URL starts with "postgresql://" or "postgres://"
 * 
 * The correct schema.prisma is selected at build time by prisma-build.js,
 * so by the time this code runs, the Prisma client is already generated
 * for the correct provider.
 * 
 * We just need to ensure DATABASE_URL is set for SQLite if missing.
 */

// For local SQLite: set DATABASE_URL if not provided (e.g. in dev mode)
const dbUrl = process.env.DATABASE_URL || ''
if (!dbUrl) {
  process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL || ''
  
  // Create PrismaClient with the appropriate datasource URL
  // The provider (sqlite vs postgresql) is already baked into the generated client
  return new PrismaClient({
    datasourceUrl: url,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
