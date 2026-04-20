import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const relayer = process.env.NEXT_PUBLIC_RELAYER_URL ?? "http://localhost:4100";
    return {
      // Only proxy API paths that are NOT implemented by this Next app (e.g. /api/chat stays local).
      fallback: [{ source: "/api/:path*", destination: `${relayer}/api/:path*` }]
    };
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source"
    });

    return config;
  }
};

export default withNextIntl(nextConfig);
