#!/usr/bin/env node
/**
 * Prisma Build Script
 * 
 * Automatically selects the correct Prisma schema based on DATABASE_URL:
 *   - If DATABASE_URL starts with "file:"  → uses schema.sqlite.prisma (local SQLite)
 *   - If DATABASE_URL starts with "postgres" → uses schema.neon.prisma (Neon PostgreSQL)
 *   - If DATABASE_URL is not set            → defaults to SQLite for local dev
 * 
 * This prevents the "URL must start with the protocol file:" error that occurs
 * when a PostgreSQL URL is used with the SQLite provider in schema.prisma.
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
  schemaSource = path.join(prismaDir, 'schema.neon.prisma');
  dbType = 'PostgreSQL (Neon)';
} else {
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
