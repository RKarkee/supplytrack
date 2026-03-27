import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['jspdf', 'fflate', 'xlsx'],
};

export default nextConfig;
