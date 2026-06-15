#!/bin/bash
# Laxree HRMS - Auto-restart daemon for production server
# DATABASE_URL is no longer needed in env - it's hardcoded in schema.prisma
PORT=3000
MAX_RETRIES=0
RETRY_COUNT=0

while true; do
  echo "[$(date)] Starting Laxree HRMS server on port $PORT..."
  PORT=3000 HOSTNAME=0.0.0.0 NODE_OPTIONS="--max-old-space-size=512" node /home/z/my-project/.next/standalone/server.js >> /home/z/my-project/server.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE"
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -gt 10 ]; then
    echo "[$(date)] Too many restarts, waiting 30s..."
    RETRY_COUNT=0
    sleep 30
  else
    sleep 3
  fi
done
