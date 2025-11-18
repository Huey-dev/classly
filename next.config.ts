import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const nextConfig: NextConfig = {
  // Next.js 15 replacement for serverComponentsExternalPackages
  serverExternalPackages: [
    "@lucid-evolution/lucid",
    "@anastasia-labs/cardano-multiplatform-lib-nodejs",
  ],

  webpack: (config: Configuration, { isServer }) => {
    // --- Enable async WASM + top-level await + layers ---
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };

    // --- Add WASM loader ---
    if (config.module?.rules) {
      config.module.rules.push({
        test: /\.wasm$/i,
        type: "webassembly/async", // only loads in the browser
      });
    }

    if (!isServer) {
      // --- Client-side Node module fallbacks ---
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
      };
    } else {
      // --- Exclude WASM/Lucid from server build ---
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        /@lucid-evolution\/uplc/,
      ];
    }

    return config;
  },
};

export default nextConfig;
