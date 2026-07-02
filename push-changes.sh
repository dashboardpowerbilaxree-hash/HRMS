#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║   Laxree HRMS - Push Math.ceil Hourly Rate Changes  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN not set!"
  echo ""
  echo "Please create a GitHub Personal Access Token (PAT):"
  echo "  1. Go to https://github.com/settings/tokens"
  echo "  2. Click 'Generate new token (classic)'"
  echo "  3. Select 'repo' scope"
  echo "  4. Generate and copy the token"
  echo ""
  echo "Then run:"
  echo "  export GITHUB_TOKEN='ghp_your_token_here'"
  echo "  bash push-changes.sh"
  exit 1
fi

# Set remote URL with token
cd /home/z/my-project
git remote set-url origin "https://dashboardpowerbilaxree-hash:${GITHUB_TOKEN}@github.com/dashboardpowerbilaxree-hash/HRMS.git"

# Push
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Push complete! Vercel will auto-deploy from GitHub."
echo "   Live URL: https://laxree-hrms.vercel.app"
echo ""
echo "📝 Changes pushed:"
echo "   - Math.ceil() applied to ALL hourlyRate calculations"
echo "   - attendance/route.ts, attendance/[id]/route.ts, bulk-upload/route.ts"
echo "   - attendance/export-monthly/route.ts, gsheet/route.ts (3 places), seed/route.ts"
echo "   - Production DB Employee.hourlyRate already updated"
echo "   - No data deleted, no attendance data modified"
