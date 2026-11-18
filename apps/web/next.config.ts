import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pacotes do monorepo são publicados como TypeScript-fonte; o Next os compila.
  transpilePackages: ['@goclient/api', '@goclient/core', '@goclient/design-tokens'],
  reactStrictMode: true,
};

export default nextConfig;
