import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Frontend-only demo: no external image hosts, no rewrites to a backend.
  poweredByHeader: false,
};

export default nextConfig;
