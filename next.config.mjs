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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude sqlite3 from client-side bundling
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        events: false,
        string_decoder: false,
      }

      // Ignore sqlite3 module in client bundle
      config.externals = config.externals || []
      config.externals.push({
        sqlite3: 'sqlite3',
      })

      // Exclude database modules from client bundle
      config.externals.push({
        './lib/database': './lib/database',
        './lib/prisma-database': './lib/prisma-database',
        './lib/database-init': './lib/database-init',
        './lib/websocket-server': './lib/websocket-server',
      })
    }

    return config
  },
}

export default nextConfig
