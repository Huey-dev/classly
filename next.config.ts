import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Webpack configuration to handle WebAssembly (.wasm) files
  webpack: (config, { isServer }) => {
    // Enable modern async WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Conditional rule for .wasm files:
    // - For the client (isServer=false), treat it as a WebAssembly module.
    // - For the server (isServer=true), treat it as a simple asset to prevent parsing errors.
    config.module.rules.push({
      test: /\.wasm$/,
      type: isServer ? 'asset/resource' : 'webassembly/async',
    });

    // Fallbacks for Node.js modules used by Web3 libraries in the browser
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
      };
    }

    return config;
  },

  // Security Headers (your original configuration)
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value:
          "frame-ancestors https://*.eternl.io/ https://eternl.io/ ionic: capacitor: chrome-extension: http://localhost:*/ https://localhost:*/;",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
