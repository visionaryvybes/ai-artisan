/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporarily disable type checking during build
  typescript: {
    ignoreBuildErrors: true
  },
  // Temporarily disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true
  },
  // Configure page extensions
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Enable production mode features
  reactStrictMode: true,
  // Configure image domains
  images: {
    domains: ['localhost', 'ai-artisan.vercel.app'],
    formats: ['image/avif', 'image/webp'],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  // Enable webpack memory optimization
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
  // Output as standalone for better Vercel compatibility
  output: 'standalone'
};

module.exports = nextConfig; 