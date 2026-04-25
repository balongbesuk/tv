import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/tv',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
