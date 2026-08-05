import type { NextConfig } from "next";

const DEFAULT_SUPABASE_URL = 'https://teqfiiavmyvvokuinjdy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcWZpaWF2bXl2dm9rdWluamR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQyNDE0LCJleHAiOjIwMTc6MjA5OTN9.fP0A4ejAFRvpk1plZvRqCjWd3cnmR2Ik62YZGyT2Sg8';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ['react-map-gl', '@vis.gl/react-mapbox', 'mapbox-gl'],
  env: {
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.TOKEN_DE_ACCESO_A_MAPA_PÚBLICO_SIGUIENTE || '',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SIGUIENTE_URL_SUPABASE_PÚBLICA || DEFAULT_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  },
  turbopack: {},
};

export default nextConfig;
