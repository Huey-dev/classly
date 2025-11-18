import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config: Configuration, { isServer }) => {
    // Ensure module.rules exists
    if (!config.module) config.module = { rules: [] };
    if (!config.module.rules) config.module.rules = [];

    // --- 1. WASM Loader ---
    config.module.rules.push({
      test: /\.wasm$/i,
      type: "webassembly/async",
    });

    // --- 2. Node core modules fallback (client only) ---
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
    }

    // --- 3. Enable async WASM + top-level await ---
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };

    // --- 4. Exclude Lucid UPLC WASM from server builds ---
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        /@lucid-evolution\/uplc/,
        /@lucid-evolution\/lucid/,
      ];
    }

    return config;
  },
  // --- Optional: Vercel serverExternalPackages for Next 15+ ---
  serverExternalPackages: ["@lucid-evolution/lucid"],
};

export default nextConfig;
