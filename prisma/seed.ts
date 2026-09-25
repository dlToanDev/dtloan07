import {
  PrismaClient,
  Role,
  ProductStatus,
  CouponType,
  AffiliateCategory,
  AffiliateLinkType,
  CourseStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu chuẩn...');

  // 1. Admin User chuẩn hoá
  const adminEmail = 'admin@hvpgroup.vn';
  const hashedPassword = bcrypt.hashSync('Admin@123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      password: hashedPassword,
      name: 'Toan Admin',
    },
    create: {
      email: adminEmail,
      name: 'Toan Admin',
      role: Role.ADMIN,
      password: hashedPassword,
      image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
  });
  console.log(`✅ Seed Admin: ${admin.email} | Mật khẩu: Admin@123456 (${admin.id})`);

  // 2. Demo Products
  const product1 = await prisma.product.upsert({
    where: { slug: 'nginx-reverse-proxy-production-template' },
    update: {},
    create: {
      slug: 'nginx-reverse-proxy-production-template',
      name: 'Template Nginx Reverse Proxy Production & Hardening',
      shortDesc:
        'Bộ cấu hình Nginx chuẩn hoá cho Next.js, Node.js, tối ưu caching tài nguyên tĩnh, rate-limit chống spam và bảo mật header A+.',
      description: `
### Tổng quan sản phẩm

Bộ cấu hình Nginx hoàn chỉnh được thiết kế đặc biệt cho các ứng dụng Next.js, Node.js tự vận hành trên VPS (Ubuntu / Debian).

#### Tính năng nổi bật:
- **Cấu hình Reverse Proxy chuẩn:** Proxy cache cho \`/_next/static/\`, bypass cho Server Actions và Webhooks.
- **Bảo mật tối đa:** Tích hợp bộ quy tắc rate-limit đa tầng (\`zone=api\`, \`zone=general\`), ẩn phiên bản Nginx, chặn dò quét file ẩn.
- **SSL Let's Encrypt:** Tự động hoá cấp mới và gia hạn qua Certbot không gián đoạn dịch vụ.
- **Kịch bản Zero-Downtime:** Đi kèm script reload an toàn.
      `.trim(),
      priceVnd: 199000,
      compareAtVnd: 299000,
      currency: 'VND',
      coverUrl: '/images/products/nginx-template.png',
      status: ProductStatus.ACTIVE,
      version: '1.0.0',
      maxDownloads: 5,
      files: {
        create: [
          {
            label: 'Nginx Production Config & Scripts (.zip)',
            storageKey: 'products/nginx-template-v1.0.0.zip',
            sizeBytes: BigInt(245760),
            version: '1.0.0',
            checksum: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          },
        ],
      },
    },
  });
  console.log(`✅ Seed Product 1: ${product1.name} (${product1.priceVnd} VND)`);

  const product2 = await prisma.product.upsert({
    where: { slug: 'docker-compose-production-starter-kit' },
    update: {},
    create: {
      slug: 'docker-compose-production-starter-kit',
      name: 'Docker Compose Fullstack Server Starter Kit',
      shortDesc:
        'Khung triển khai Docker Compose toàn diện: PostgreSQL 16, Redis Cache, Nginx Reverse Proxy và script tự động sao lưu định kỳ lên Cloudflare R2.',
      description: `
### Tổng quan sản phẩm

Giải pháp hạ tầng độc lập "1-click deploy" giúp bạn triển khai toàn bộ ứng dụng web production trên bất kỳ VPS nào chỉ với Docker và Docker Compose.

#### Bộ thành phần bao gồm:
- **PostgreSQL 16:** Đã cấu hình tối ưu bộ nhớ, healthcheck và volume persistent.
- **Redis Alpine:** Cấu hình bảo vệ mật khẩu, snapshot RDB/AOF.
- **Auto-Backup Engine:** Script backup database mỗi đêm, nén gzip và tự động đẩy lên Cloudflare R2 / AWS S3.
- **Giám sát sức khoẻ máy chủ:** Dashboard nhẹ kiểm soát RAM/CPU.
      `.trim(),
      priceVnd: 299000,
      compareAtVnd: 499000,
      currency: 'VND',
      coverUrl: '/images/products/docker-starter.png',
      status: ProductStatus.ACTIVE,
      version: '1.2.0',
      maxDownloads: 5,
      files: {
        create: [
          {
            label: 'Docker Compose Starter Kit & Runbook (.zip)',
            storageKey: 'products/docker-starter-kit-v1.2.0.zip',
            sizeBytes: BigInt(512000),
            version: '1.2.0',
            checksum: 'sha256:d82c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b123',
          },
        ],
      },
    },
  });
  console.log(`✅ Seed Product 2: ${product2.name} (${product2.priceVnd} VND)`);

  // 2b. Mỗi sản phẩm phải có ít nhất 1 biến thể, nếu không thì không thêm được vào giỏ.
  for (const product of [product1, product2]) {
    const existing = await prisma.productVariant.findFirst({ where: { productId: product.id } });
    if (existing) continue;
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: 'Mặc định',
        priceVnd: product.priceVnd,
        compareAtVnd: product.compareAtVnd,
        stock: null,
        sortOrder: 0,
      },
    });
  }
  console.log('✅ Seed biến thể "Mặc định" cho sản phẩm demo');

  // 3. Demo Coupon
  const coupon = await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: CouponType.PERCENT,
      value: 10,
      maxUses: 100,
      active: true,
    },
  });
  console.log(`✅ Seed Coupon: ${coupon.code} (Giảm ${coupon.value}%)`);

  // 4. Affiliate Items (Cloud, DevTools, Shopee, TikTok, ToolCode)
  const affiliateDeals = [
    {
      slug: 'hetzner-cloud',
      name: 'Hetzner Cloud VPS',
      category: AffiliateCategory.CLOUD,
      platform: 'Hetzner',
      description:
        'Nhà cung cấp VPS hiệu năng cao giá rẻ nhất châu Âu. Thích hợp chạy Docker, Next.js và Postgres production.',
      perks: 'Tặng €20 Cloud Credits dùng thử',
      couponCode: undefined,
      directUrl: 'https://hetzner.cloud/?ref=demo-referral',
      shortenedUrl: 'https://megaurl.in/hetzner-demo',
      activeUrlType: AffiliateLinkType.DIRECT,
      logoUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg',
      featured: true,
      active: true,
    },
    {
      slug: 'digitalocean',
      name: 'DigitalOcean Cloud',
      category: AffiliateCategory.CLOUD,
      platform: 'DigitalOcean',
      description:
        'Nền tảng Cloud thân thiện cho lập trình viên, App Platform và Managed Kubernetes tuyệt vời.',
      perks: 'Tặng $200 Credits trong 60 ngày',
      couponCode: undefined,
      directUrl: 'https://m.do.co/c/demo-referral',
      shortenedUrl: 'https://megaurl.in/do-demo',
      activeUrlType: AffiliateLinkType.DIRECT,
      logoUrl:
        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/digitalocean/digitalocean-original.svg',
      featured: true,
      active: true,
    },
    {
      slug: 'cursor-ide',
      name: 'Cursor AI Code Editor',
      category: AffiliateCategory.TOOLCODE,
      platform: 'Cursor',
      description:
        'Trình soạn thảo mã nguồn tích hợp AI mạnh mẽ nhất hiện nay, tăng tốc độ code lên gấp 3 lần.',
      perks: 'Dùng thử 14 ngày Pro miễn phí',
      couponCode: undefined,
      directUrl: 'https://cursor.com/?ref=demo-referral',
      shortenedUrl: 'https://megaurl.in/cursor-demo',
      activeUrlType: AffiliateLinkType.DIRECT,
      logoUrl: 'https://www.google.com/s2/favicons?domain=cursor.com&sz=128',
      featured: true,
      active: true,
    },
    {
      slug: 'ban-phim-co-lap-trinh-shopee',
      name: 'Bàn phím cơ lập trình viên Custom Switch',
      category: AffiliateCategory.SHOPEE,
      platform: 'Shopee',
      description:
        'Bàn phím cơ 75% gõ êm, pin trâu 4000mAh, kết nối 3 mode cho anh em coder gõ code cả ngày không mỏi tay.',
      perks: 'Voucher giảm 50k + Freeship Xtra',
      couponCode: 'DEV50K',
      directUrl: 'https://shopee.vn/product-dev-keyboard-demo',
      shortenedUrl: 'https://megaurl.in/shopee-kb',
      activeUrlType: AffiliateLinkType.DIRECT,
      logoUrl: 'https://deo.shopeemobile.com/shopee/shopee-seller-live-sg/rootpages/favicon.ico',
      featured: true,
      active: true,
    },
    {
      slug: 'mic-thu-am-podcast-tiktok',
      name: 'Mic thu âm Podcast & Video Review Công nghệ',
      category: AffiliateCategory.TIKTOK,
      platform: 'TikTok',
      description:
        'Micro lọc ồn chuẩn phòng thu, cắm trực tiếp vào điện thoại hoặc PC, phù hợp làm nội dung dạy học và review.',
      perks: 'Flash Sale TikTok Shop giảm 25%',
      couponCode: undefined,
      directUrl: 'https://vt.tiktok.com/ZSdemo-mic',
      shortenedUrl: 'https://megaurl.in/tiktok-mic',
      activeUrlType: AffiliateLinkType.DIRECT,
      logoUrl: 'https://sf-tb-sg.ibytedtos.com/obj/eden-sg/uoml_zlp_eh/tiktok_favicon.ico',
      featured: true,
      active: true,
    },
  ];

  for (const deal of affiliateDeals) {
    await prisma.affiliateItem.upsert({
      where: { slug: deal.slug },
      update: deal,
      create: deal,
    });
  }
  console.log(
    `✅ Seed ${affiliateDeals.length} Affiliate Deals (bao gồm Shopee & TikTok & ToolCode)`,
  );

  // 5. Demo Courses
  const courses = [
    {
      slug: 'khoa-hoc-nextjs-15-production',
      title: 'Xây dựng Web Sản phẩm số Fullstack với Next.js 15 & Server Actions',
      description:
        'Học cách thiết kế kiến trúc chuẩn production: NextAuth v5, Prisma ORM, Thanh toán SePay VietQR, bảo vệ file số Cloudflare R2 và tối ưu SEO Core Web Vitals.',
      priceVnd: 499000,
      compareAtVnd: 899000,
      level: 'Trung cấp đến Chuyên sâu',
      duration: '18 giờ video + Source code',
      status: CourseStatus.ACTIVE,
      learnUrl: 'https://hvpgroup.vn/courses/nextjs-15',
      coverUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    },
    {
      slug: 'khoa-hoc-devops-vps-linux',
      title: 'Quản trị Máy chủ VPS Linux, Nginx & Docker từ Zero đến Hero',
      description:
        "Thực chiến tự build hạ tầng server chạy độc lập: Cấu hình Firewall UFW, Nginx Reverse Proxy, Docker Compose, SSL Let's Encrypt tự động và kịch bản Auto Backup.",
      priceVnd: 350000,
      compareAtVnd: 600000,
      level: 'Cơ bản đến Nâng cao',
      duration: '12 giờ video',
      status: CourseStatus.ACTIVE,
      learnUrl: 'https://hvpgroup.vn/courses/devops-linux',
      coverUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800',
    },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where: { slug: course.slug },
      update: course,
      create: course,
    });
  }
  console.log(`✅ Seed ${courses.length} Khóa học`);

  console.log('🎉 Hoàn tất seed dữ liệu thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
