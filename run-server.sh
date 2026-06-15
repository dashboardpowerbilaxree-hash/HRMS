#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export PORT=3000
export HOSTNAME=0.0.0.0
while true; do
  NODE_OPTIONS="--max-old-space-size=512" node .next/standalone/server.js 2>&1 | tee -a server.log
  echo "[$(date)] Server crashed, restarting in 3s..." >> server.log
  sleep 3
done
