import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const nextConfig: NextConfig = {
  webpack: (config: Configuration, { isServer }) => {
    // Ensure experiments are enabled
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };

    // Add WASM loader
    config.module?.rules?.push({
      test: /\.wasm$/i,
      type: "webassembly/async",
    });

    // Client-side Node module fallbacks
    if (!isServer) {
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
      // Exclude Lucid WASM from server
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        /@lucid-evolution\/uplc/,
      ];
    }

    return config;
  },

  // Externalize Lucid to prevent server parsing WASM
  serverExternalPackages: ["@lucid-evolution/lucid"],
};

export default nextConfig;
