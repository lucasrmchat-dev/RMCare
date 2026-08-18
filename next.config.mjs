/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  allowedDevOrigins: [
    "192.168.15.5",
    "192.168.15.11",
    "192.168.15.10",
    "192.168.15.7",
    "192.168.15.8",
    "192.168.15.4",
    "192.168.15.6",
    "192.168.15.3",
    "192.168.15.2",
    "localhost"
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
