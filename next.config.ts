import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The dev environment cannot reach external image hosts reliably. Let the
    // browser load remote images directly instead of routing every request
    // through the Next.js optimizer, which was exhausting server memory.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: {
    // Keeps the compiler's memory footprint low on constrained machines.
    webpackMemoryOptimizations: true,
    cpus: 1,
    workerThreads: false,
  },
  outputFileTracingRoot: __dirname,
  webpack(config, { dev }) {
    // Persistent dev caching repeatedly exhausted memory on this machine.
    // Production builds keep the cache so Next's page manifest stays correct.
    if (dev) config.cache = false;
    return config;
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
