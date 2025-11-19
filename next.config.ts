import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Webpack Configuration for WASM and Fallbacks
  webpack: (config, { isServer, webpack }) => {
    // Fix for WASM in Next.js (required for @emurgo/cardano-message-signing-browser)
    // 1.1. Enable async WebAssembly experiments
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true, // Recommended for App Router features
    };

    // 1.2. Add a rule to handle .wasm files as 'webassembly/async' modules
    // This is the key fix for the "Module parse failed" error.
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // 1.3. Handle server-side dependencies (required for client-side Web3 libraries)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // These modules are often used by Web3 libraries but are not available in the browser
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // 2. Security Headers
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value:
          "frame-ancestors https://*.eternl.io/ https://eternl.io/ ionic: capacitor: chrome-extension: http://localhost:*/ https://localhost:*/;",
      },
      // You can add other security headers here (e.g., X-Content-Type-Options, Strict-Transport-Security )
    ];

    return [
      {
        // Apply headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // 3. Other Next.js Configuration (optional, but good practice)
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
