import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://truenas-scale.tail16dc5.ts.net/**')], // <-- coloca o domínio do teu Supabase aqui
  },
  env: {
    // Expose Vercel git environment variables to the client
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  },
};

module.exports = nextConfig;
  
