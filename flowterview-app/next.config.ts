import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only run ESLint on specific directories during production builds
    dirs: ["src", "components", "lib", "app", "pages"],
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
  compiler: {
    // Remove console logs in production for smaller bundle
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Optimize webpack for faster dev builds
  webpack: (config, { isServer, dev, webpack }) => {
    // Optimize for development speed
    if (dev) {
      // Disable source maps in development for faster builds
      config.devtool = false;

      // Enable faster incremental builds
      config.cache = {
        type: "filesystem",
        allowCollectingMemory: true,
      };

      // Optimize module resolution
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }

    // Prevent server-only packages from being bundled in client-side code
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // Suppress warnings for both dev and production
    config.ignoreWarnings = [
      { message: /Failed to parse source map/ },
      { message: /Critical dependency/ },
      { message: /the request of a dependency is an expression/ },
    ];

    return config;
  },

  // Experimental optimizations
  experimental: {
    // Enable optimistic client router cache
    optimisticClientCache: true,
    // Enable partial prerendering for better performance
    ppr: false, // Set to true when stable
  },
};

export default nextConfig;
