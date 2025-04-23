/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals = [...config.externals, "ApexCharts"];
    return config;
  },
  images: {
    domains: [
      "pbs.twimg.com",
      "abs.twimg.com",
      "raw.githubusercontent.com",
      "dexscreener.com",
      "dextools.io",
      "basescan.org",
      "res.cloudinary.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "abs.twimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "dexscreener.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "dextools.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "basescan.org",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
