#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=512" node .next/standalone/server.js 2>&1 | tee -a server.log
  echo "[$(date)] Server crashed, restarting in 3s..." >> server.log
  sleep 3
done
