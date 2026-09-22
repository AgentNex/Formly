const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer, webpack }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["@"] = path.resolve(__dirname);

    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      ...(config.resolve.modules || []),
    ];

    if (!isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          "process.env.NEXT_PUBLIC_CONVEX_URL": JSON.stringify(
            process.env.NEXT_PUBLIC_CONVEX_URL || "https://omnisync-core.convex.cloud"
          ),
          "process.browser": JSON.stringify(true),
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
