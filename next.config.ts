import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const nextConfig: NextConfig = {
  webpack: (config: Configuration, { isServer }) => {
    // --- Ensure module.rules exists ---
    if (!config.module) config.module = { rules: [] };
    if (!config.module.rules) config.module.rules = [];

    // --- Add WASM loader ---
    config.module.rules.push({
      test: /\.wasm$/i,
      type: "webassembly/async", // load in browser only
    });

    // --- Exclude WASM from server build ---
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        /@lucid-evolution\/uplc/,
      ];
    } else {
      // Client-side fallback for Node core modules
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
      };
    }

    // Enable async WASM + top-level await
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };

    return config;
  },
};

export default nextConfig;
