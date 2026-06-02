#!/bin/bash
# Robust keep-alive for Laxree HRMS
# Restarts server whenever it goes down
cd /home/z/my-project

LOG=keep-alive.log
echo "[$(date)] Keep-alive daemon started" >> $LOG

while true; do
  # Check if server responds
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
  
  if [ "$RESPONSE" != "200" ] && [ "$RESPONSE" != "304" ]; then
    echo "[$(date)] Server down (HTTP $RESPONSE), restarting..." >> $LOG
    
    # Kill any leftover processes
    pkill -f "standalone/server.js" 2>/dev/null
    pkill -f "node server.js" 2>/dev/null
    sleep 2
    
    # Start server in background with disown
    cd /home/z/my-project/.next/standalone
    PORT=3000 HOSTNAME=0.0.0.0 DATABASE_URL="file:/home/z/my-project/db/custom.db" NODE_ENV=production node server.js >> /home/z/my-project/$LOG 2>&1 &
    SERVER_PID=$!
    disown $SERVER_PID 2>/dev/null
    cd /home/z/my-project
    
    echo "[$(date)] Started server PID $SERVER_PID" >> $LOG
    sleep 5
    
    # Verify it started
    CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
    if [ "$CHECK" = "200" ] || [ "$CHECK" = "304" ]; then
      echo "[$(date)] Server started successfully" >> $LOG
    else
      echo "[$(date)] Server failed to start (HTTP $CHECK)" >> $LOG
    fi
  fi
  
  sleep 5
done
