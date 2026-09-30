import { clientEnv } from '@/config/env';

/**
 * Nguồn sự thật duy nhất cho metadata của site.
 * Không hardcode tên/URL rải rác trong component.
 */
export const siteConfig = {
  name: 'dltoan07',
  shortName: 'dltoan07',
  description:
    'Blog chuyên sâu về lập trình, quản trị server Linux, Nginx, Docker và bán sản phẩm số cho lập trình viên.',
  logo: '/images/logo.jpeg',
  shopPath: clientEnv.NEXT_PUBLIC_SHOP_PATH,
  url: clientEnv.NEXT_PUBLIC_SITE_URL,
  locale: 'vi_VN',
  timeZone: 'Asia/Ho_Chi_Minh',
  author: {
    name: 'Hoàng Anh Toàn',
    email: 'dltoan07@gmail.com',
    phone: '0798566374',
    address: 'Văn Hội, Bắc Từ Liêm, Hà Nội',
    bio: 'Tôi là Hoàng Anh Toàn, hiện đang sinh sống và làm việc tại Hà Nội. Đam mê lập trình, quản trị hệ thống và chia sẻ kiến thức công nghệ.',
  },
  links: {
    github: 'https://github.com/dltoan07',
    facebook: 'https://facebook.com/dltoan07',
    youtube: 'https://youtube.com/@dltoan07',
    telegram: 'https://t.me/dltoan07Blog',
    tiktok: 'https://tiktok.com/@dltoan07',
  },
  nav: [
    { label: 'Trang chủ', href: '/' },
    { label: 'Bài viết', href: '/blog' },
    { label: 'Shop', href: clientEnv.NEXT_PUBLIC_SHOP_PATH },
    { label: 'Khóa học', href: '/courses' },
    { label: 'Affiliate', href: '/affiliate' },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
