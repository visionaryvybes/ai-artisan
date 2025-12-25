/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable strict mode for better development experience
  reactStrictMode: true,

  // Configure image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true, // Required for static export compatibility
  },

  // Webpack configuration for client-side AI libraries
  webpack: (config, { isServer }) => {
    // Handle ONNX runtime and other native modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Ensure proper handling of WebAssembly files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Add rule for WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Handle ONNX runtime - mark as external to prevent bundling issues
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': false,
      'sharp': false,
    };

    // Ignore binary files
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });

    return config;
  },

  // Headers for SharedArrayBuffer (required for some AI features)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },

  // Output configuration for Vercel
  output: 'standalone',
};

module.exports = nextConfig;
