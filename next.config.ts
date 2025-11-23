import { NextConfig } from 'next';
const nextConfig: NextConfig = {
    // Add custom Webpack configuration
    webpack: (config, { isServer }) => {
        
        // 1. Enable asynchronous WebAssembly modules
        // This is crucial for correctly importing WASM files like those in Lucid/UPLC.
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            layers: true,
        };

        // 2. Add a rule to handle .wasm files explicitly
        // We tell Webpack to treat .wasm files as a resource (asset/resource)
        // instead of trying to parse them as standard JavaScript modules.
        config.module.rules.push({
            test: /\.wasm$/,
            type: "asset/resource",
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