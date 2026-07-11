import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // 파일 업로드(Route Handlers + Server Actions) 본문 크기 제한 상향
  // 기본 1MB → 50MB (업로드 API 한도와 동일)
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
