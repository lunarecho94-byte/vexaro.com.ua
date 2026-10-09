/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'easydrop.one',
      },
      {
        protocol: 'https',
        hostname: 'backend.mydrop.com.ua',
      },
      {
        protocol: 'https',
        hostname: 'mydrop.com.ua',
      },
    ],
  },
};

export default nextConfig;
