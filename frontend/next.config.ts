import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only run ESLint on specific directories during production builds
    dirs: ["src", "components", "lib", "app", "pages"],
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
  compiler: {
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
  output: "standalone",

  // Optimize webpack for faster dev builds and fix server-only package bundling
  webpack: (config, { isServer, dev, webpack }) => {
    // Prevent server-only packages from being bundled in client-side code
    if (!isServer) {
      config.plugins.push(
        // Ignore OpenTelemetry packages in client builds
        new webpack.IgnorePlugin({
          resourceRegExp: /@opentelemetry\/instrumentation/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /@opentelemetry\/api/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /require-in-the-middle/,
        }),
        // Ignore server-specific Sentry packages
        new webpack.IgnorePlugin({
          resourceRegExp: /@sentry\/node/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /@sentry\/profiling-node/,
        })
      );

      // Prevent Node.js specific modules from being resolved in client
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

    // Only apply expensive source map processing in production
    if (!isServer && !dev) {
      // Add a rule to handle source maps for problematic packages (production only)
      config.module.rules.push({
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
        exclude: [
          /node_modules[\\/].+[\\/]daily-esm\.js/,
          /node_modules[\\/].+[\\/]@pipecat-ai[\\/].+\.js/,
          /node_modules[\\/].+[\\/]@opentelemetry[\\/].+\.js/,
          /node_modules[\\/].+[\\/]require-in-the-middle[\\/].+\.js/,
        ],
      });
    }

    // Suppress warnings for both dev and production
    config.ignoreWarnings = [
      { message: /Failed to parse source map/ },
      { message: /Critical dependency.*require-in-the-middle/ },
      { message: /Critical dependency.*@opentelemetry/ },
      { message: /the request of a dependency is an expression/ },
      { message: /Critical dependency: require function is used in a way/ },
    ];

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
        // Add specific aliases for heavy modules if needed
      };
    }

    return config;
  },
};

// Apply Sentry config only in production to avoid dev overhead
export default process.env.NODE_ENV === "production"
  ? withSentryConfig(nextConfig, {
      org: "layerpath-tb",
      project: "javascript-nextjs",
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig;
