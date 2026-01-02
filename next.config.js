/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Turbopack (default in Next.js 16)
  turbopack: {},
  // Standalone output for packaging
  output: 'standalone',
  // Note: instrumentation.ts is available by default in Next.js 16+
};

module.exports = nextConfig;
