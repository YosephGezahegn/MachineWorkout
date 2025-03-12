/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static optimization where possible
  output: 'standalone',
  // Disable image optimization during development
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Enable strict mode for better development experience
  reactStrictMode: true,
  // Disable source maps in production
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig
