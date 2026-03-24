/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
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
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
