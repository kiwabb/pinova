import type { NextConfig } from "next";

const mediaPublicBaseUrl = (
  process.env.PINOVA_MEDIA_PUBLIC_BASE_URL ?? "http://127.0.0.1:19000"
).replace(/\/$/, "");
const mediaBucket = process.env.PINOVA_MINIO_BUCKET ?? "pinova-public";
const mediaHostname = new URL(mediaPublicBaseUrl).hostname;
const allowLocalMediaOptimization = ["127.0.0.1", "localhost", "[::1]"].includes(
  mediaHostname,
);

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    dangerouslyAllowLocalIP: allowLocalMediaOptimization,
    remotePatterns: [new URL(`${mediaPublicBaseUrl}/${mediaBucket}/**`)],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
