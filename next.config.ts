import { NextConfig } from 'next';

const nextConfig: NextConfig = {
    webpack: (config, { isServer }) => {
        
        // 1. Enable asynchronous WebAssembly modules
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            layers: true,
        };

        // 2. Add a rule to handle .wasm files explicitly
        config.module.rules.push({
            test: /\.wasm$/,
            type: "asset/resource",
        });

        // 3. Suppress dynamic require warnings (critical for lucid-cardano/lucid-evolution)
        config.module = {
            ...config.module,
            exprContextCritical: false,
            unknownContextCritical: false,
        };

        // 4. Ignore node: protocol imports
        config.resolve.alias = {
            ...config.resolve.alias,
            'node:crypto': false,
            'node:stream': false,
            'node:buffer': false,
        };

        // 5. Client-side fallbacks for Node.js modules
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
                stream: false,
                url: false,
                zlib: false,
                http: false,
                https: false,
                assert: false,
                os: false,
                path: false,
                buffer: false,
            };
        } else {
            // Server-side WASM configuration
            config.output.webassemblyModuleFilename = "chunks/[id].wasm";
        }
        
        return config;
    },
    
    // Explicitly transpile lucid-evolution
    transpilePackages: ['@lucid-evolution/lucid'],
};

export default nextConfig;