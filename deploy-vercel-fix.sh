#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║   Laxree HRMS - Vercel Deployment Fix           ║"
echo "║   Fixes: Prisma 'URL must start with file:'     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Step 0: Get Neon DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is required!"
  echo ""
  echo "Get your Neon connection string from:"
  echo "  https://console.neon.tech → Your Project → Connect"
  echo ""
  echo "Format: postgresql://neondb_owner:PASSWORD@ep-XXX.neon.tech/neondb?sslmode=require"
  echo ""
  echo "Then run:"
  echo "  export DATABASE_URL='your-neon-connection-string-here'"
  echo "  bash deploy-vercel-fix.sh"
  exit 1
fi

echo "✅ DATABASE_URL detected: ${DATABASE_URL:0:30}..."
echo ""

# Step 1: Push schema to Neon
echo "━━━ Step 1: Pushing schema to Neon PostgreSQL ━━━"
cp prisma/schema.neon.prisma prisma/schema.prisma
DATABASE_URL="$DATABASE_URL" npx prisma db push --skip-generate
echo "✅ Schema pushed to Neon"
echo ""

# Step 2: Reset schema for repo (build script handles selection)
echo "━━━ Step 2: Resetting schema for repository ━━━"
cp prisma/schema.sqlite.prisma prisma/schema.prisma
echo "✅ Schema reset to SQLite (for repo)"
echo ""

# Step 3: Git push
echo "━━━ Step 3: Pushing to GitHub ━━━"
git add -A
git commit -m "fix: dual-database auto-detection for Vercel deployment" || true
git push origin main
echo "✅ Pushed to GitHub"
echo ""

# Step 4: Deploy to Vercel
echo "━━━ Step 4: Deploying to Vercel ━━━"
echo ""
echo "IMPORTANT: Set these environment variables in Vercel:"
echo "  DATABASE_URL = $DATABASE_URL"
echo ""
echo "Option A: Vercel Dashboard"
echo "  1. Go to https://vercel.com/dashboard"
echo "  2. Select your HRMS project → Settings → Environment Variables"
echo "  3. Add: DATABASE_URL = $DATABASE_URL"
echo "  4. Go to Deployments → Redeploy"
echo ""
echo "Option B: Vercel CLI"
echo "  vercel --prod"
echo ""

# Try Vercel CLI if available
if command -v vercel &> /dev/null; then
  echo "Vercel CLI found. Attempting deployment..."
  vercel --prod --yes 2>&1 || echo "⚠️ Vercel login required. Run: vercel login"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   HOW THE FIX WORKS                             ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║  prisma-build.js auto-detects DATABASE_URL:      ║"
echo "║                                                  ║"
echo "║  • file:...        → SQLite schema (local)       ║"
echo "║  • postgresql:...  → PostgreSQL schema (Vercel)  ║"
echo "║  • (not set)       → defaults to SQLite          ║"
echo "║                                                  ║"
echo "║  This eliminates the mismatch that caused:       ║"
echo "║  'URL must start with the protocol file:'        ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
