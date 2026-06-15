#!/usr/bin/env node
/**
 * Prisma Build Script
 * 
 * The default schema.prisma uses PostgreSQL (for Vercel production).
 * This script switches to SQLite only for local development.
 * 
 * Logic:
 *   - If DATABASE_URL starts with "file:"  → switch to SQLite schema (local dev)
 *   - If DATABASE_URL starts with "postgres" → keep PostgreSQL schema (Vercel)
 *   - If DATABASE_URL is not set            → switch to SQLite schema (local dev fallback)
 * 
 * IMPORTANT: schema.prisma defaults to PostgreSQL so Vercel works
 * even if this script doesn't run during the build.
 */

const { execSync } = require('child_process');
const { copyFileSync } = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || '';
const prismaDir = path.join(__dirname, 'prisma');
const schemaPath = path.join(prismaDir, 'schema.prisma');

let schemaSource;
let dbType;

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
  // PostgreSQL URL detected — keep the default PostgreSQL schema
  schemaSource = path.join(prismaDir, 'schema.neon.prisma');
  dbType = 'PostgreSQL (Neon)';
} else {
  // file: URL or no URL — switch to SQLite for local development
  schemaSource = path.join(prismaDir, 'schema.sqlite.prisma');
  dbType = 'SQLite (local)';
  
  // For local SQLite, ensure DATABASE_URL is set so Prisma can find the DB
  if (!dbUrl.startsWith('file:')) {
    process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db';
  }
}

console.log(`\n🔧 Prisma Build: Detected ${dbType} database`);
console.log(`   DATABASE_URL: ${dbUrl ? dbUrl.substring(0, 40) + '...' : '(not set, using default SQLite)'}\n`);

// Copy the correct schema to schema.prisma
copyFileSync(schemaSource, schemaPath);
console.log(`   Using schema: ${path.basename(schemaSource)} → schema.prisma`);

// Generate Prisma client
try {
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log(`\n✅ Prisma client generated successfully for ${dbType}\n`);
} catch (error) {
  console.error(`\n❌ Prisma generate failed for ${dbType}:`, error.message);
  process.exit(1);
}
