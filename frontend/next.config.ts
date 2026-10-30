import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // The frontend has its own lockfile and should be treated as the app root.
    root: process.cwd(),
  },
};

export default nextConfig;
