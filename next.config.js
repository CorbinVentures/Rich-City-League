/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'images.unsplash.com', 'via.placeholder.com'],
    unoptimized: true,
  },
};

module.exports = nextConfig;
