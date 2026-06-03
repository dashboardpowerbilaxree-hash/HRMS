#!/bin/bash
cd /home/z/my-project/.next/standalone

# Copy static assets (NEVER copy database — it must persist!)
cp -rf /home/z/my-project/public /home/z/my-project/.next/standalone/public 2>/dev/null
cp -rf /home/z/my-project/.next/static /home/z/my-project/.next/standalone/.next/static 2>/dev/null

while true; do
  if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[$(date)] Starting server..." >> /home/z/my-project/daemon.log
    DATABASE_URL="file:/home/z/my-project/db/custom.db" \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=768" \
    node server.js 2>> /home/z/my-project/daemon.log
    echo "[$(date)] Server exited, restarting in 5s..." >> /home/z/my-project/daemon.log
    sleep 5
  else
    sleep 10
  fi
done
