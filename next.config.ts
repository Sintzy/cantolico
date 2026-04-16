import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuração do Turbopack (Next.js 16+)
  turbopack: {
    root: process.cwd(),
  },
  
  // Image optimization
  images: {
    // Enable modern image formats
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images for 1 year (they have hash in filename)
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'truenas-scale.fold-pence.ts.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.clerk.com',
        pathname: '**',
      },
    ],
  },
  
  // Compression
  compress: true,
  
  // Performance optimization
  experimental: {
    // Tree shake unused code more aggressively
    optimizePackageImports: [
      '@/components',
      '@/lib',
      '@/hooks',
      'lucide-react'
    ],
  },
  
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  
  webpack: (config, { isServer }) => {
    // Exclude native binaries from webpack bundling
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'snappy': 'commonjs snappy',
        '@napi-rs/snappy-win32-x64-msvc': 'commonjs @napi-rs/snappy-win32-x64-msvc',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
  
