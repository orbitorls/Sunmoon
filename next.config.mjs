/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    pagesBufferLength: 5,
  },
  compress: true,
  productionBrowserSourceMaps: false,

  modularizeImports: {
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/{{member}}',
    },
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '.',
    };

    return config;
  },

  experimental: {
    optimizeCss: false,
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "*.devtunnels.ms",
        "*.ngrok.io",
        "*.ngrok-free.app",
      ],
    },
    ppr: false,
  },

  headers: async () => {
    // Next.js applies EVERY matching rule in array order and the LAST match
    // wins for a given header key (it assigns into a shared header object and
    // keeps iterating). Rules must therefore be ordered general -> specific, or
    // the specific ones get clobbered — which is what used to happen here:
    // /_next/static and /api/tiles were both overridden by more general rules.
    return [
      {
        // Baseline: HTML pages revalidate on every request.
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // API routes must not be cached by default.
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate, max-age=0",
          },
        ],
      },
      {
        // Tile packs are content-addressed artifacts, safe to cache hard.
        source: "/api/tiles/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, s-maxage=604800",
          },
          {
            key: "Vary",
            value: "Accept-Encoding",
          },
        ],
      },
      {
        // Tide predictions are a pure function of (lat, lon, start, hours,
        // interval), so they are safe to cache at the CDN. These routes run on
        // the edge runtime, so a server-side Redis cache is not an option here.
        source: "/api/(predict-tide|hydro-tide)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=900, stale-while-revalidate=3600",
          },
          {
            key: "Vary",
            value: "Accept-Encoding",
          },
        ],
      },
      {
        // Only Next.js hashed build assets may be cached immutable for one year.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
