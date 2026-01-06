/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack due to Windows compatibility issues
  // turbopack: {},
  // Standalone output for packaging
  output: 'standalone',
  // Note: instrumentation.ts is available by default in Next.js 16+
};

module.exports = nextConfig;
