import { clientEnv } from '@/config/env';

/**
 * Nguồn sự thật duy nhất cho metadata của site.
 * Không hardcode tên/URL rải rác trong component.
 */
export const siteConfig = {
  name: 'dltoan Blog',
  shortName: 'dltoan Blog',
  description:
    'Blog chuyên sâu về lập trình, quản trị server Linux, Nginx, Docker và bán sản phẩm số cho lập trình viên.',
  url: clientEnv.NEXT_PUBLIC_SITE_URL,
  locale: 'vi_VN',
  timeZone: 'Asia/Ho_Chi_Minh',
  author: {
    name: 'TODO: tên của bạn',
    email: 'TODO@yourdomain.com',
  },
  links: {
    github: '',
    facebook: '',
    youtube: '',
  },
  nav: [
    { label: 'Bài viết', href: '/blog' },
    { label: 'Sản phẩm', href: '/products' },
    { label: 'Ưu đãi & Tools', href: '/affiliate' },
    { label: 'Giới thiệu', href: '/about' },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
