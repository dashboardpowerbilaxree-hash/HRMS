#!/bin/bash
cd /home/z/my-project/.next/standalone
export PORT=3000
export HOSTNAME=0.0.0.0
export DATABASE_URL="file:/home/z/my-project/.next/standalone/db/custom.db"
export NODE_OPTIONS="--max-old-space-size=512"
exec node server.js
