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
  // Enable development mode features
  reactStrictMode: true,
  // Configure image domains
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true // Allow unoptimized images in development
  },
  // Enable webpack memory optimization
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  }
};

module.exports = nextConfig; 