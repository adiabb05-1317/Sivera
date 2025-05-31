/** @type {import('next').NextConfig} */
const nextConfig = {
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
      // Ignore problematic dynamic imports
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
        // Add specific fallbacks for Monaco Editor
        module: false,
        dgram: false,
        dns: false,
        child_process: false,
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
          /node_modules[\\/].+[\\/]monaco-editor[\\/].+\.js/,
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
      { message: /Can't resolve.*dynamic/ },
      { message: /Critical dependency.*monaco-editor/ },
    ];

    // Optimize for development speed
    if (dev) {
      // Disable source maps in development for faster builds
      config.devtool = false;

      // Enable faster incremental builds with more aggressive caching
      config.cache = {
        type: "filesystem",
        allowCollectingMemory: true,
        maxMemoryGenerations: 1,
      };

      // Optimize module resolution for development
      config.resolve.alias = {
        ...config.resolve.alias,
      };

      // Reduce the number of modules processed in development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    return config;
  },

  // Experimental optimizations
  experimental: {
    // Enable optimistic client router cache
    optimisticClientCache: true,
  },
};

export default nextConfig;
