#!/bin/bash
# Rebuild and restart Laxree HRMS
cd /home/z/my-project

echo ">>> Backing up database..."
cp /home/z/my-project/db/custom.db /home/z/my-project/db/custom.db.bak 2>/dev/null

echo ">>> Regenerating Prisma client..."
npx prisma generate

echo ">>> Building Next.js..."
npx next build

echo ">>> Copying static files to standalone..."
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
cp -r prisma .next/standalone/

echo ">>> Killing old server..."
pkill -f "standalone/server.js" 2>/dev/null
pkill -f "robust-daemon" 2>/dev/null
sleep 2

echo ">>> Starting server..."
cd /home/z/my-project
nohup bash robust-daemon.sh >> server.log 2>&1 &
sleep 3

echo ">>> Testing server..."
RESPONSE=$(node -e "
const http = require('http');
const req = http.request('http://127.0.0.1:3000/', (res) => {
  console.log(res.statusCode);
});
req.on('error', () => console.log('0'));
req.end();
" 2>/dev/null)

if [ "$RESPONSE" = "200" ]; then
  echo ">>> Server is running at http://localhost:3000"
else
  echo ">>> WARNING: Server may not be responding (HTTP $RESPONSE)"
fi

echo ">>> IMPORTANT: Clear browser cache (Ctrl+Shift+R) to avoid chunk loading errors"
