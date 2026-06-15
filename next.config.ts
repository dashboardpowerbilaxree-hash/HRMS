import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't use 'standalone' output on Vercel - Vercel uses its own serverless runtime
  // Only use standalone for local/Docker deployments
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
