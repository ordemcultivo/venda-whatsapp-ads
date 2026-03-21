import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera build standalone para Docker (inclui server.js)
  output: 'standalone',
};

export default nextConfig;
