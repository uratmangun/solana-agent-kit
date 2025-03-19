/** @type {import('next').NextConfig} */

const nextConfig = {
  transpilePackages: ["@getpara/react-sdk", "@getpara/web-sdk", "@getpara/*"],
  output: 'standalone',
  eslint: {
    // Disables ESLint during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignores TypeScript errors during the build
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;