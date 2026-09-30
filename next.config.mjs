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
    const isProd = process.env.NODE_ENV === 'production';

    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http:",
      "media-src 'self' https: blob:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://accounts.google.com https://challenges.cloudflare.com https://payos.vn https://*.payos.vn https://www.youtube.com https://youtube.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      ...(isProd ? ['upgrade-insecure-requests'] : []),
    ].join('; ');

    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Content-Security-Policy', value: cspDirectives },
      ...(isProd
        ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload',
            },
          ]
        : []),
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
