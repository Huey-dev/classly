import { NextConfig } from 'next';
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
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

    return config;
  },
};

module.exports = nextConfig;
