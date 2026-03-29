import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Configuração do Turbopack (Next.js 16+)
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
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
    ],
  },
  env: {
    // Expose Vercel git environment variables to the client
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    // Set build time during the build process
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
  
