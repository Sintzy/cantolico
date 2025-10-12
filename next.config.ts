import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
  env: {
    // Expose Vercel git environment variables to the client
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    // Set build time during the build process
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // Ezoic ads.txt redirect configuration
  async redirects() {
    return [
      {
        source: '/ads.txt',
        destination: 'https://srv.adstxtmanager.com/19390/cantolico.pt',
        permanent: true, // 301 redirect for SEO
      },
    ];
  },
};

module.exports = nextConfig;
  
