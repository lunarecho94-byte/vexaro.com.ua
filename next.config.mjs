/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
  async redirects() {
    return [
      {
        source: '/product/mte-sk8-hi-khutro-vn04',
        destination: '/product/vans-sk8-hi-mte-gore-tex-vn04',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
