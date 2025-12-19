import { NextConfig } from 'next';
import CopyWebpackPlugin from "copy-webpack-plugin";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "image.mux.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
      { protocol: "https", hostname: "i.imgur.com" },
    ],
  },

  
  // Add custom Webpack configuration
  webpack: (config, { isServer }) => {
    // 1. Enable asynchronous WebAssembly modules
    // This is crucial for correctly importing WASM files like those in Lucid/UPLC.
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
// Critical: Exclude WASM from server bundle
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@lucid-evolution/lucid': 'commonjs @lucid-evolution/lucid',
      });
    }
    // 2. Handle .wasm as async WebAssembly modules (required for lucid-evolution)
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // For Node.js environments (server-side rendering), ensure the WASM file
    // isn't bundled but instead resolved as an external dependency if needed.
    if (isServer) {
      config.output.webassemblyModuleFilename = "chunks/[id].wasm";
    }

    // Copy WASM assets needed by lucid/cardano libs into server chunks
    const wasmSources = [
      "@anastasia-labs/cardano-multiplatform-lib-browser/cardano_multiplatform_lib_bg.wasm",
      "@emurgo/cardano-message-signing-browser/cardano_message_signing_bg.wasm",
      "@lucid-evolution/uplc/dist/browser/uplc_tx_bg.wasm",
    ];
    config.plugins = config.plugins || [];
    const targets = [
      path.resolve(__dirname, ".next/server/chunks/[name][ext]"),
      path.resolve(__dirname, ".next/server/vendor-chunks/[name][ext]"),
      path.resolve(__dirname, ".next/dev/server/chunks/[name][ext]"),
      path.resolve(__dirname, ".next/dev/server/vendor-chunks/[name][ext]"),
    ];
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: wasmSources.flatMap((src) =>
          targets.map((to) => ({
            from: path.resolve(__dirname, "node_modules", ...src.split("/")),
            to,
          }))
        ),
      })
    );

    return config;
  },
};

module.exports = nextConfig;
