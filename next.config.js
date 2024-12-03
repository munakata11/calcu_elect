/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    forceSwcTransforms: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  distDir: 'build',
  webpack: (config) => {
    return config
  }
}

module.exports = nextConfig 