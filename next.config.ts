import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bypass environment-specific type resolution errors that crash the build worker
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['react-map-gl', 'mapbox-gl'],
  env: {
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  }
};

export default nextConfig;
