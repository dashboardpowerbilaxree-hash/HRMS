#!/bin/bash
# Rebuild and restart Laxree HRMS
cd /home/z/my-project

echo ">>> Backing up database..."
cp /home/z/my-project/db/custom.db /home/z/my-project/db/custom.db.bak 2>/dev/null

echo ">>> Building Next.js..."
npx next build

echo ">>> Copying static files to standalone..."
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

echo ">>> Restarting PM2..."
pm2 delete laxree 2>/dev/null
sleep 1
cd /home/z/my-project
pm2 start .next/standalone/server.js --name laxree -- --port 3000

echo ">>> Waiting for server..."
sleep 3

echo ">>> Server status:"
pm2 list

echo ">>> Done! Server is running at http://localhost:3000"
echo ">>> IMPORTANT: Clear browser cache (Ctrl+Shift+R) to avoid chunk loading errors"
