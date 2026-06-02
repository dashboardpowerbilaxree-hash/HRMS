#!/bin/bash
cd /home/z/my-project
while true; do
  if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[$(date)] Starting dev server..." >> /home/z/my-project/daemon.log
    DATABASE_URL="file:/home/z/my-project/db/custom.db" \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    npx next dev --webpack 2>> /home/z/my-project/daemon.log
    echo "[$(date)] Server exited, restarting in 5s..." >> /home/z/my-project/daemon.log
    sleep 5
  else
    sleep 10
  fi
done
