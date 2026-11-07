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
  transpilePackages: ['@paypal/agent-toolkit', '@bryntum/gantt', '@bryntum/gantt-react', 'ag-studio', 'ag-studio-react'],
  // Use standalone output
  output: 'standalone',
  // Disable static generation for specific pages
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'x-dynamic-route',
            value: 'true',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;