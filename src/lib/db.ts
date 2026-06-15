import { PrismaClient } from '@prisma/client'

/**
 * Database initialization for Laxree HRMS
 * 
 * Supports two modes:
 * 1. SQLite (local): DATABASE_URL starts with "file:"
 * 2. PostgreSQL/Neon (Vercel): DATABASE_URL starts with "postgresql://" or "postgres://"
 * 
 * The schema.prisma is selected at build time by prisma-build.js.
 * At runtime, we ensure DATABASE_URL is always valid for the current provider.
 */

// Ensure DATABASE_URL is set for SQLite if not provided
const dbUrl = process.env.DATABASE_URL || ''
if (!dbUrl) {
  process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL || ''
  
  // For PostgreSQL (Neon) on Vercel serverless, use the Neon HTTP adapter
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    try {
      // Dynamic import for Neon adapter - only used on Vercel
      const { PrismaNeonHTTP } = require('@prisma/adapter-neon')
      const { neon } = require('@neondatabase/serverless')
      
      const sql = neon(url)
      const adapter = new PrismaNeonHTTP(sql)
      
      return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
    } catch (adapterError) {
      // If adapter fails, fall back to direct connection
      console.warn('Neon adapter not available, using direct PostgreSQL connection')
      return new PrismaClient({
        datasourceUrl: url,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
    }
  }
  
  // SQLite (local) - use datasourceUrl to ensure correct path
  return new PrismaClient({
    datasourceUrl: url,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
