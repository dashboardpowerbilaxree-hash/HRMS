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
 */

// For local SQLite: set DATABASE_URL if not provided
const dbUrl = process.env.DATABASE_URL || ''
if (!dbUrl) {
  process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL || ''
  
  // For PostgreSQL on Vercel, try using the Neon serverless adapter
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    try {
      const { Pool } = require('@neondatabase/serverless')
      const { PrismaNeonHTTP } = require('@prisma/adapter-neon')
      
      const pool = new Pool({ connectionString: url })
      const adapter = new PrismaNeonHTTP(pool)
      
      return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
    } catch {
      // Fallback to standard PrismaClient if adapter is not available
      // (adapter may not work in all environments)
      return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
    }
  }
  
  // For SQLite (local dev)
  return new PrismaClient({
    datasourceUrl: url,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
