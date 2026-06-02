#!/bin/bash
cd /home/z/my-project/.next/standalone
cp -f /home/z/my-project/db/custom.db db/custom.db 2>/dev/null

# Start server in background
DATABASE_URL="file:/home/z/my-project/.next/standalone/db/custom.db" \
PORT=3000 \
HOSTNAME=0.0.0.0 \
NODE_ENV=production \
node --max-old-space-size=2048 --expose-gc server.js &

SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "Server ready after ${i}s"
    break
  fi
  sleep 1
done

# Warm up API routes (one at a time with pauses)
echo "Warming up routes..."
sleep 2
curl -s --max-time 30 "http://localhost:3000/api/employees?status=Yes" > /dev/null 2>&1 && echo "  employees OK" || echo "  employees FAIL"
sleep 3
curl -s --max-time 30 "http://localhost:3000/api/attendance?month=5&year=2026" > /dev/null 2>&1 && echo "  attendance OK" || echo "  attendance FAIL"
sleep 3
curl -s --max-time 30 "http://localhost:3000/api/attendance/monthly-summary?month=5&year=2026" > /dev/null 2>&1 && echo "  monthly OK" || echo "  monthly FAIL"
sleep 3
curl -s --max-time 30 "http://localhost:3000/api/dashboard" > /dev/null 2>&1 && echo "  dashboard OK" || echo "  dashboard FAIL"
sleep 3
curl -s --max-time 30 "http://localhost:3000/api/notifications" > /dev/null 2>&1 && echo "  notifications OK" || echo "  notifications FAIL"
sleep 3
curl -s --max-time 30 -X POST "http://localhost:3000/api/attendance/bulk-upload" -F "file=@/tmp/test_attendance.xlsx" -F "date=2026-05-16" > /dev/null 2>&1 && echo "  bulk-upload OK" || echo "  bulk-upload FAIL"

echo "Warm-up complete! Server is ready."

# Keep the server running
wait $SERVER_PID
