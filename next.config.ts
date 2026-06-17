import type { NextConfig } from 'next';

const legacyPort = process.env.LEGACY_PORT || '3001';

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }

    const legacyBase = `http://localhost:${legacyPort}`;

    // Solo fallback legacy explícito (/legacy/*). APIs y paneles están en Next.
    return [
      {
        source: '/legacy/:path*',
        destination: `${legacyBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
