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
  // Enable static optimization
  output: 'standalone',
  // Enable strict mode
  reactStrictMode: true,
  // Configure image domains
  images: {
    domains: ['ai-artisan.vercel.app'],
    formats: ['image/avif', 'image/webp'],
  },
  // Configure for serverless
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig; 