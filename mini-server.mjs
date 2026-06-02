import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const PORT = 3000;
const STATIC_DIR = './.next/static';
const PUBLIC_DIR = './public';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

// Serve Next.js app by proxying to the actual Next.js server
// This is just a keepalive wrapper
console.log('Minimal server not suitable for Next.js - using next dev instead');
