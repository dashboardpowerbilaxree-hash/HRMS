#!/bin/bash
pkill -f "standalone/server.js" 2>/dev/null
pkill -f "node server.js" 2>/dev/null
sleep 2
cd /home/z/my-project/.next/standalone
PORT=3000 HOSTNAME=0.0.0.0 DATABASE_URL="file:/home/z/my-project/db/custom.db" NODE_ENV=production node server.js &
