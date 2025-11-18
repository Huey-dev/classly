import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const nextConfig: NextConfig = {
  webpack(config: Configuration, { isServer }: { isServer: boolean }) {
    config.experiments = {
      ...(config.experiments ?? {}),
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };

    if (isServer) {
      // Normalize externals to an array so we can safely spread
      const existingExternals: any[] = Array.isArray(config.externals)
        ? config.externals
        : [];

      config.externals = [
        ...existingExternals,
        "@lucid-evolution/lucid",
        "@anastasia-labs/cardano-multiplatform-lib-nodejs",
      ];
    } else {
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

    return config;
  },

  serverExternalPackages: ["@lucid-evolution/lucid"],
};

export default nextConfig;
