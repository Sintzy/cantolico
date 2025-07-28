import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [new URL('https://truenas-scale.tail16dc5.ts.net/**')], // <-- coloca o domínio do teu Supabase aqui
  },
};

module.exports = nextConfig;
  
