/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true },
  images: {
    domains: [
      'ui.avatars.io',
      'firebasestorage.googleapis.com',
    ],
  },
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

