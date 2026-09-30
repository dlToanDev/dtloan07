/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['resend', '@prisma/client', 'prisma'],
  experimental: {
    serverActions: {
      // Chừa phần overhead multipart; action upload ảnh vẫn tự giới hạn file ở 8 MB.
      bodySizeLimit: '10mb',
    },
  },
  // Fail the build on type/lint errors — do NOT set ignoreBuildErrors.
  images: {
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Source Code đã gộp vào Shop (loại hàng "Source code") — giữ link cũ không bị 404.
  async redirects() {
    return [
      { source: '/profile', destination: '/account', permanent: true },
      { source: '/admin/source-code', destination: '/admin/shop', permanent: true },
      { source: '/admin/source-code/new', destination: '/admin/shop/new', permanent: true },
      {
        source: '/admin/source-code/:id/edit',
        destination: '/admin/shop/:id/edit',
        permanent: true,
      },
      { source: '/shop', destination: '/afiuafhu283an', permanent: false },
      { source: '/shop/:slug', destination: '/afiuafhu283an/:slug', permanent: false },
    ];
  },
  async rewrites() {
    const customShopPath = process.env.NEXT_PUBLIC_SHOP_PATH?.trim();
    if (customShopPath && customShopPath !== '/afiuafhu283an') {
      const cleanPath = customShopPath.startsWith('/') ? customShopPath : `/${customShopPath}`;
      return [
        { source: cleanPath, destination: '/afiuafhu283an' },
        { source: `${cleanPath}/:slug`, destination: '/afiuafhu283an/:slug' },
      ];
    }
    return [];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
