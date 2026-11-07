/** @type {import('next').NextConfig} */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  transpilePackages: ['@paypal/agent-toolkit'],
};

module.exports = nextConfig;