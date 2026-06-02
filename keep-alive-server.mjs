import { spawn } from 'child_process';

function startServer() {
  console.log(`[${new Date().toISOString()}] Starting server...`);
  
  const server = spawn('node', ['.next/standalone/server.js'], {
    env: { ...process.env, PORT: '3000', NODE_OPTIONS: '--max-old-space-size=256' },
    stdio: 'inherit'
  });

  server.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited with code: ${code}, signal: ${signal}`);
    console.log('Restarting in 3 seconds...');
    setTimeout(startServer, 3000);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });
}

startServer();

// Prevent parent from exiting
setInterval(() => {}, 60000);
