#!/bin/bash
set -e

echo "=============================================="
echo "  Laxree HRMS - Vercel Deployment Script"
echo "=============================================="
echo ""

echo "Step 1: Setting up Neon Database"
echo "---------------------------------"
echo "1. Go to https://console.neon.tech"
echo "2. Select your 'HRMS' project"
echo "3. Click 'Connect' button"
echo "4. Copy the connection string"
echo "   (Format: postgresql://neondb_owner:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require)"
echo ""
read -p "Paste your Neon connection string: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: Database URL is required!"
    exit 1
fi

# Step 2: Set up Prisma schema on Neon
echo ""
echo "Step 2: Pushing Prisma schema to Neon..."
export DATABASE_URL="$DATABASE_URL"

# Switch to Neon schema
cp prisma/schema.neon.prisma prisma/schema.prisma
npx prisma db push --skip-generate

# Step 3: Seed the database
echo ""
echo "Step 3: Seeding the database..."
echo "Call the seed API after deployment:"
echo "  curl -X POST https://YOUR_VERCEL_URL/api/seed"

# Step 4: Push to GitHub
echo ""
echo "Step 4: Pushing to GitHub..."
echo "Make sure your GitHub PAT has 'Contents: Read and Write' permission."

# Reset schema to env-based for the repo (build script handles selection)
cp prisma/schema.sqlite.prisma prisma/schema.prisma

git add -A
git commit -m "Deploy: update for Neon PostgreSQL" || true
git push -u origin main --force

# Step 5: Deploy to Vercel
echo ""
echo "Step 5: Deploying to Vercel..."
echo "Option A: Deploy via Vercel Dashboard"
echo "  1. Go to https://vercel.com/new"
echo "  2. Import the HRMS repository from GitHub"
echo "  3. Set environment variable:"
echo "     DATABASE_URL = $DATABASE_URL"
echo "  4. Click 'Deploy'"
echo ""
echo "Option B: Deploy via Vercel CLI"
echo "  Make sure DATABASE_URL is set in Vercel project settings"
vercel --prod

echo ""
echo "=============================================="
echo "  Deployment Complete!"
echo "=============================================="
echo ""
echo "IMPORTANT: After deployment, seed the database:"
echo "  curl -X POST https://YOUR_VERCEL_URL/api/seed"
echo ""
echo "NOTE: The prisma-build.js script automatically detects DATABASE_URL"
echo "  - file: URLs → SQLite schema"
echo "  - postgresql: URLs → PostgreSQL/Neon schema"
echo "  No manual schema switching needed!"
