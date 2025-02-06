/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true, // Since we're dealing with local blobs and data URLs
  },
  typescript: {
    ignoreBuildErrors: false, // Set to true only if you want to deploy with type errors
  },
  eslint: {
    ignoreDuringBuilds: false, // Set to true only if you want to deploy with linting errors
  },
};

module.exports = nextConfig; 