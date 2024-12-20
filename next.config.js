/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    forceSwcTransforms: true,
  },
  distDir: 'out',
  swcMinify: true,
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  basePath: '',
  trailingSlash: true,
  optimizeFonts: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  sassOptions: {
    includePaths: ['./styles'],
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '/your-prefix' : '',
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'static/fonts/[name][ext]'
      }
    });

    config.output = {
      ...config.output,
      publicPath: './'
    };

    return config;
  },
}

module.exports = nextConfig;
