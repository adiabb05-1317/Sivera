import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only run ESLint on specific directories during production builds
    dirs: ["src", "components", "lib", "app", "pages"],
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
  /* config options here */
};

export default nextConfig;
