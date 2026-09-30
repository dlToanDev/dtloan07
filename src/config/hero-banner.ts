export interface HeroBannerItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  badge?: string;
  ctaText?: string;
  targetBlank?: boolean;
}

export interface HeroBannerConfig {
  enabled: boolean;
  autoPlay: boolean;
  intervalSeconds: number;
  banners: HeroBannerItem[];
  updatedAt?: string;
}

export const DEFAULT_HERO_BANNER_CONFIG: HeroBannerConfig = {
  enabled: true,
  autoPlay: true,
  intervalSeconds: 5,
  banners: [
    {
      id: 'banner-1',
      title: 'Vietnix Cloud Server NVMe',
      subtitle: 'Tối ưu hoá cho Docker & Nginx, tặng kèm DirectAdmin & Chống DDoS',
      imageUrl: '/images/banners/banner-1.svg',
      linkUrl: 'https://vietnix.vn',
      active: true,
      badge: 'Đối tác DevOps',
      ctaText: 'Khám Phá Dịch Vụ',
      targetBlank: true,
    },
    {
      id: 'banner-2',
      title: 'Vultr Cloud Compute - VPS Toàn Cầu',
      subtitle: 'Tặng ngay $100 Credit trải nghiệm hạ tầng điện toán đám mây tốc độ cao',
      imageUrl: '/images/banners/banner-2.svg',
      linkUrl: 'https://www.vultr.com',
      active: true,
      badge: 'Cloud Toàn Cầu',
      ctaText: 'Nhận $100 Credit',
      targetBlank: true,
    },
    {
      id: 'banner-3',
      title: 'AZDIGI Turbo Cloud Hosting',
      subtitle: 'Tăng tốc website 300% với LiteSpeed Enterprise & NVMe U.2',
      imageUrl: '/images/banners/banner-3.svg',
      linkUrl: 'https://azdigi.com',
      active: true,
      badge: 'Khuyến Mại 50%',
      ctaText: 'Đăng Ký Hosting',
      targetBlank: true,
    },
  ],
};
