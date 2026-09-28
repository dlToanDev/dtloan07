import {
  PrismaClient,
  Role,
  ProductStatus,
  ProductSaleMode,
  ProductType,
  ItemCondition,
  DeliveryMode,
  AccountStockStatus,
  CouponType,
  LessonStatus,
  AnnouncementType,
  CommunityPostStatus,
} from '@prisma/client';
import { encryptCredentials } from '../src/lib/crypto/credentials';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu nạp dữ liệu mẫu phong phú cho hệ thống...');

  // 1. Tìm tài khoản admin để gán tác giả cho Community Post
  const admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });

  if (!admin) {
    throw new Error('Chưa có tài khoản admin. Hãy tạo admin trước.');
  }

  // 2. Cập nhật 2 sản phẩm cũ sang đúng category & type
  await prisma.product.updateMany({
    where: {
      slug: {
        in: ['nginx-reverse-proxy-production-template', 'docker-compose-production-starter-kit'],
      },
    },
    data: {
      categoryId: 'cat_source_code',
      type: ProductType.DOWNLOAD,
    },
  });
  console.log('✅ Đã cập nhật chuyên mục và loại cho 2 sản phẩm mẫu ban đầu.');

  // 3. Tạo thêm các sản phẩm Shop đa dạng thể loại
  const newProducts = [
    {
      slug: 'saas-nextjs-starter-kit-pro',
      name: 'Fullstack SaaS Starter Kit Next.js 15 Pro',
      shortDesc:
        'Boilerplate hoàn chỉnh cho dự án SaaS: Next.js 15 App Router, Auth.js v5, Prisma ORM, Thanh toán SePay VietQR + Stripe, Tailwind CSS v4 và Email Resend.',
      description: `
### Giới thiệu sản phẩm
Fullstack SaaS Starter Kit là bộ mã nguồn được tối ưu hoá toàn diện cho các nhà phát triển và startup muốn tung sản phẩm ra thị trường chỉ sau vài ngày thay vì hàng tháng.

#### Công nghệ sử dụng:
- **Framework:** Next.js 15 (Turbopack, Server Actions, React 19)
- **Database & ORM:** PostgreSQL 16 + Prisma ORM
- **Authentication:** Auth.js v5 hỗ trợ cả Credentials, Google OAuth, GitHub OAuth và Magic Link
- **Thanh toán:** Tích hợp sẵn PayOS VietQR tự động khớp đơn và Stripe Quốc tế
- **Giao diện:** Tailwind CSS v4, Dark/Light theme, Radix UI & Lucide Icons
- **Deployment:** Cấu hình Dockerfile đa tầng chuẩn Production, script Nginx và GitHub Actions CI/CD
      `.trim(),
      priceVnd: 599000,
      compareAtVnd: 999000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.DOWNLOAD,
      categoryId: 'cat_source_code',
      version: '2.0.0',
      maxDownloads: 10,
      gallery: [
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
      ],
      variants: [
        {
          name: 'Bản Tiêu chuẩn (Single Project)',
          priceVnd: 599000,
          compareAtVnd: 999000,
          stock: null,
        },
        {
          name: 'Bản Unlimited (Không giới hạn dự án)',
          priceVnd: 1290000,
          compareAtVnd: 1990000,
          stock: null,
        },
      ],
      files: [
        {
          label: 'SaaS Starter Kit v2.0 Source Code (.zip)',
          storageKey: 'products/saas-starter-v2.zip',
          sizeBytes: BigInt(1048576),
          version: '2.0.0',
        },
      ],
    },
    {
      slug: 'tai-khoan-chatgpt-plus-1-thang',
      name: 'Tài khoản ChatGPT Plus chính chủ OpenAI (1 Tháng)',
      shortDesc:
        'Tài khoản OpenAI có sẵn gói ChatGPT Plus: Dùng GPT-4o, GPT-o1, Canvas, tạo ảnh DALL-E 3 không giới hạn và tính năng nâng cao.',
      description: `
### Thông tin tài khoản ChatGPT Plus
Tài khoản được đăng ký chính chủ từ OpenAI, kích hoạt sẵn gói thuê bao Plus 1 tháng.

#### Đặc quyền gói ChatGPT Plus:
- Truy cập không giới hạn mô hình tư duy **o1-preview**, **o1-mini** và **GPT-4o**.
- Trải nghiệm tính năng **Canvas** chỉnh sửa văn bản và viết code tương tác trực tiếp.
- Tạo hình ảnh AI chất lượng cao với **DALL-E 3**.
- Tốc độ phản hồi cực nhanh, không lo nghẽn mạng vào giờ cao điểm.
- Hỗ trợ đổi mật khẩu và bảo hành trọn thời gian sử dụng.
      `.trim(),
      priceVnd: 280000,
      compareAtVnd: 490000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.ACCOUNT,
      categoryId: 'cat_account',
      deliveryMode: DeliveryMode.AUTO,
      warrantyNote: 'Bảo hành 1 đổi 1 trong suốt 30 ngày sử dụng',
      version: '1.0.0',
      maxDownloads: 1,
      variants: [
        { name: 'Gói 1 Tháng', priceVnd: 280000, compareAtVnd: 490000, stock: 5 },
        { name: 'Gói 3 Tháng', priceVnd: 790000, compareAtVnd: 1350000, stock: 3 },
      ],
      stockAccounts: [
        'Email: gpt_vip_user01@hvpgroup.vn | Pass: GptPro@2026! | OTP Secret: JBSWY3DPEHPK3PXP',
        'Email: gpt_vip_user02@hvpgroup.vn | Pass: GptPro@2026! | OTP Secret: JBSWY3DPEHPK3PXP',
      ],
    },
    {
      slug: 'tai-khoan-cursor-pro-1-thang',
      name: 'Tài khoản Cursor Pro AI Editor (1 Tháng)',
      shortDesc:
        'Gói Pro trình soạn thảo mã nguồn Cursor AI: 500 Fast Premium Requests GPT-4o / Claude 3.5 Sonnet mỗi tháng, Agent Mode tự sửa lỗi.',
      description: `
### Trình soạn thảo thông minh nhất dành cho Developer
Cursor Pro giúp bạn tăng tốc độ lập trình gấp 3 đến 5 lần nhờ tích hợp sâu trí tuệ nhân tạo vào IDE.

#### Quyền lợi Cursor Pro:
- **500 Fast Premium Requests:** Sử dụng Claude 3.5 Sonnet và GPT-4o tốc độ cao nhất.
- **Không giới hạn Slow Requests:** Dùng thoải mái sau khi hết lượt nhanh.
- **Cursor Composer / Agent Mode:** Tự động sửa lỗi nhiều file cùng lúc theo yêu cầu.
- **Codebase Indexing:** AI hiểu toàn bộ cấu trúc dự án của bạn để đưa ra gợi ý chuẩn xác.
      `.trim(),
      priceVnd: 320000,
      compareAtVnd: 500000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.ACCOUNT,
      categoryId: 'cat_account',
      deliveryMode: DeliveryMode.AUTO,
      warrantyNote: 'Bảo hành 30 ngày kể từ ngày nhận tài khoản',
      version: '1.0.0',
      maxDownloads: 1,
      variants: [
        { name: 'Gói 1 Tháng (Chính chủ)', priceVnd: 320000, compareAtVnd: 500000, stock: 4 },
      ],
      stockAccounts: [
        'Email: cursor_pro_01@hvpgroup.vn | Pass: CursorDev@2026 | Recovery: rec_cur_01_a98f',
      ],
    },
    {
      slug: 'ban-phim-co-keychron-k2-pro-wireless',
      name: 'Bàn phím cơ không dây Keychron K2 Pro QMK/VIA (Gateron Red Switch)',
      shortDesc:
        'Bàn phím cơ layout 75% gọn gàng, hỗ trợ kết nối Bluetooth 5.1 và Type-C, tuỳ biến keymap bằng QMK/VIA, switch Gateron gõ êm nhẹ.',
      description: `
### Chi tiết sản phẩm bàn phím Keychron K2 Pro
Dòng bàn phím cơ công thái học hoàn hảo cho lập trình viên và người gõ văn bản chuyên nghiệp.

#### Thông số kỹ thuật:
- **Layout:** 75% (84 phím) giữ nguyên hàng F và cụm phím điều hướng
- **Switch:** Gateron G Pro Red (Linear, 45g lực nhấn, cực êm cho không gian văn phòng)
- **Hotswap:** Dễ dàng thay thế switch 3-pin và 5-pin không cần hàn
- **Kết nối:** Bluetooth 5.1 kết nối tối đa 3 thiết bị cùng lúc + Cáp Type-C
- **Tình trạng:** Hàng trưng bày Like New 99%, đầy đủ hộp và phụ kiện cáp nối
      `.trim(),
      priceVnd: 1850000,
      compareAtVnd: 2350000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.PHYSICAL,
      categoryId: 'cat_tech',
      condition: ItemCondition.LIKE_NEW,
      conditionNote: 'Hàng trưng bày showroom, đẹp 99% không trầy xước, đủ phụ kiện fullbox',
      warrantyNote: 'Bảo hành phần cứng 3 tháng',
      version: '1.0.0',
      maxDownloads: 0,
      gallery: [
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
        'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800',
      ],
      variants: [
        { name: 'Red Switch (Linear)', priceVnd: 1850000, compareAtVnd: 2350000, stock: 2 },
        { name: 'Brown Switch (Tactile)', priceVnd: 1890000, compareAtVnd: 2390000, stock: 1 },
      ],
    },
    {
      slug: 'ao-hoodie-lap-trinh-vien-eat-sleep-code',
      name: 'Áo Hoodie Developer "Eat Sleep Code Repeat" (Nỉ bông cao cấp)',
      shortDesc:
        'Áo Hoodie form rộng unisex cho coder, chất liệu vải nỉ chân cua 380gsm dày dặn, ấm áp, giữ form tốt sau nhiều lần giặt.',
      description: `
### Chi tiết áo Hoodie Developer
Chiếc áo hoodie kinh điển mà mọi lập trình viên đều muốn sở hữu trong tủ đồ mùa đông.

#### Đặc điểm nổi bật:
- **Chất liệu:** Nỉ bông cotton 100% định lượng 380gsm, mềm mại, thoáng khí nhưng giữ ấm cực tốt.
- **Form dáng:** Oversize unisex trẻ trung, mũ trùm 2 lớp dày dặn có dây rút kim loại.
- **Hình in:** Công nghệ in lụa cao cấp, sắc nét, không bong tróc kể cả giặt máy.
      `.trim(),
      priceVnd: 380000,
      compareAtVnd: 550000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.PHYSICAL,
      categoryId: 'cat_apparel',
      version: '1.0.0',
      maxDownloads: 0,
      variants: [
        { name: 'Size M / Màu Đen', priceVnd: 380000, compareAtVnd: 550000, stock: 10 },
        { name: 'Size L / Màu Đen', priceVnd: 380000, compareAtVnd: 550000, stock: 15 },
        { name: 'Size XL / Màu Đen', priceVnd: 380000, compareAtVnd: 550000, stock: 8 },
      ],
    },
    {
      slug: 'coc-su-developer-there-is-no-place-like-127-0-0-1',
      name: 'Cốc sứ lập trình viên "There is no place like 127.0.0.1" (350ml)',
      shortDesc:
        'Cốc sứ trắng tráng men cao cấp in thông điệp dí dỏm "Home Sweet Home", chịu nhiệt lò vi sóng, đồng hành cùng tách cà phê mỗi sáng.',
      description: `
### Cốc sứ truyền cảm hứng làm việc
Món quà tuyệt vời dành tặng bản thân hoặc đồng nghiệp trong văn phòng công nghệ.

- Dung tích: 350ml
- Men sứ trắng ceramic nung ở 1300 độ C, an toàn cho sức khỏe
- Sử dụng tốt trong lò vi sóng và máy rửa bát
      `.trim(),
      priceVnd: 95000,
      compareAtVnd: 150000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.PHYSICAL,
      categoryId: 'cat_mug',
      version: '1.0.0',
      maxDownloads: 0,
      variants: [
        { name: 'Mặc định (350ml Trắng)', priceVnd: 95000, compareAtVnd: 150000, stock: 30 },
      ],
    },
  ];

  for (const item of newProducts) {
    const { variants, files, stockAccounts, ...prodData } = item;

    const product = await prisma.product.upsert({
      where: { slug: prodData.slug },
      update: prodData,
      create: prodData,
    });

    // Tạo variants
    if (variants && variants.length > 0) {
      for (const [i, v] of variants.entries()) {
        let variant = await prisma.productVariant.findFirst({
          where: { productId: product.id, name: v.name },
        });

        if (!variant) {
          variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              name: v.name,
              priceVnd: v.priceVnd,
              compareAtVnd: v.compareAtVnd,
              stock: v.stock,
              sortOrder: i,
            },
          });
        }

        // Nếu có stockAccounts và là variant đầu tiên, nạp tài khoản mã hóa
        if (i === 0 && stockAccounts && stockAccounts.length > 0) {
          for (const rawAccount of stockAccounts) {
            const encrypted = encryptCredentials(rawAccount);
            const exists = await prisma.accountStock.findFirst({
              where: { variantId: variant.id, credentials: encrypted },
            });
            if (!exists) {
              await prisma.accountStock.create({
                data: {
                  variantId: variant.id,
                  credentials: encrypted,
                  status: AccountStockStatus.AVAILABLE,
                },
              });
            }
          }
        }
      }
    }

    // Tạo files nếu có
    if (files && files.length > 0) {
      for (const f of files) {
        const fileExists = await prisma.productFile.findFirst({
          where: { productId: product.id, storageKey: f.storageKey },
        });
        if (!fileExists) {
          await prisma.productFile.create({
            data: {
              productId: product.id,
              label: f.label,
              storageKey: f.storageKey,
              sizeBytes: f.sizeBytes,
              version: f.version,
            },
          });
        }
      }
    }

    console.log(`✅ Seed Product: ${product.name} (${product.type} / ${product.priceVnd} VND)`);
  }

  // 4. Seed Khóa học & Bài học (Lessons)
  const courses = await prisma.course.findMany();
  for (const course of courses) {
    if (course.slug === 'khoa-hoc-nextjs-15-production') {
      const lessons = [
        {
          title: 'Bài 1: Giới thiệu kiến trúc Next.js 15 App Router & Server Actions',
          slug: 'bai-1-kien-truc-nextjs-15',
          sortOrder: 1,
          isPreview: true,
          status: LessonStatus.PUBLISHED,
          videoUrl: 'https://www.youtube.com/watch?v=wm5gMKuwSYk',
          content: `
# Bài 1: Kiến trúc tổng quan Next.js 15

Chào mừng bạn đến với khóa học thực chiến xây dựng web sản phẩm số!

Trong bài mở đầu này, chúng ta sẽ cùng phân tích:
1. **Server Components vs Client Components:** Cách phân định rõ ranh giới để tối ưu bundle size.
2. **Server Actions:** Thay thế hoàn toàn cho API Routes truyền thống trong xử lý form và mutation.
3. **Caching Layer:** Các cơ chế lưu đệm mới trong Next.js 15 và cách vô hiệu hóa đúng lúc.
          `.trim(),
        },
        {
          title: 'Bài 2: Thiết kế Database PostgreSQL & Quản lý Migration với Prisma',
          slug: 'bai-2-thiet-ke-database-prisma',
          sortOrder: 2,
          isPreview: true,
          status: LessonStatus.PUBLISHED,
          videoUrl: 'https://www.youtube.com/watch?v=rLRIB6E4B4w',
          content: `
# Bài 2: Thiết kế Schema Database cho E-commerce

Nội dung trọng tâm:
- Mô hình quan hệ giữa User, Order, Product, Variant và License.
- Chiến lược đánh Index để tăng tốc độ truy vấn gấp 10 lần.
- Sử dụng Docker Compose để chạy PostgreSQL cục bộ mà không làm rác máy dev.
          `.trim(),
        },
        {
          title: 'Bài 3: Xây dựng hệ thống Xác thực Auth.js v5 (NextAuth)',
          slug: 'bai-3-xac-thuc-authjs-v5',
          sortOrder: 3,
          isPreview: false,
          status: LessonStatus.PUBLISHED,
          content: `
# Bài 3: Xác thực bảo mật với Auth.js v5

Nội dung dành cho học viên chính thức:
- Cấu hình Credentials Provider với bcrypt và JWT session.
- Tích hợp OAuth Google & GitHub đăng nhập 1-click.
- Middleware bảo vệ các trang quản trị /admin và tài khoản /account.
          `.trim(),
        },
        {
          title: 'Bài 4: Tích hợp Cổng thanh toán VietQR & Webhook tự động duyệt đơn',
          slug: 'bai-4-tich-hop-vietqr-webhook',
          sortOrder: 4,
          isPreview: false,
          status: LessonStatus.PUBLISHED,
          content: `
# Bài 4: Tự động hóa thanh toán ngân hàng qua VietQR

Nội dung chuyên sâu:
- Sinh mã QR chuyển khoản theo cú pháp đơn hàng.
- Xử lý Webhook bảo mật bằng chữ ký SHA256 chống giả mạo request.
- Kích hoạt giao hàng tức thì ngay sau khi tiền về tài khoản.
          `.trim(),
        },
      ];

      for (const l of lessons) {
        await prisma.lesson.upsert({
          where: { courseId_slug: { courseId: course.id, slug: l.slug } },
          update: l,
          create: { ...l, courseId: course.id },
        });
      }
      console.log(`✅ Seed ${lessons.length} bài học cho khóa: ${course.title}`);
    }

    if (course.slug === 'khoa-hoc-devops-vps-linux') {
      const lessons = [
        {
          title: 'Bài 1: Khởi tạo VPS Ubuntu, Cấu hình SSH Key & Tắt root password',
          slug: 'bai-1-khoi-tao-vps-ssh-key',
          sortOrder: 1,
          isPreview: true,
          status: LessonStatus.PUBLISHED,
          videoUrl: 'https://www.youtube.com/watch?v=hQWRp-TXCqg',
          content: `
# Bài 1: Thiết lập nền tảng bảo mật cho VPS mới

Hướng dẫn các bước chuẩn hoá:
1. Tạo cặp khoá SSH Ed25519 mạnh mẽ.
2. Tạo tài khoản sudoer riêng biệt và vô hiệu hoá SSH login bằng tài khoản root.
3. Đổi cổng SSH mặc định từ 22 sang cổng tuỳ biến để chống brute-force bot.
          `.trim(),
        },
        {
          title: 'Bài 2: Tường lửa UFW, Fail2ban và Docker Hardening',
          slug: 'bai-2-tuong-lua-ufw-fail2ban',
          sortOrder: 2,
          isPreview: true,
          status: LessonStatus.PUBLISHED,
          content: `
# Bài 2: Phòng thủ đa tầng trên máy chủ Linux

Các chủ đề thực hành:
- Thiết lập UFW chỉ mở các cổng thiết yếu (80, 443 và cổng SSH bí mật).
- Cài đặt Fail2ban tự động khoá IP dò quét sau 3 lần nhập sai pass.
- Lưu ý xung đột phổ biến giữa UFW và iptables của Docker.
          `.trim(),
        },
      ];

      for (const l of lessons) {
        await prisma.lesson.upsert({
          where: { courseId_slug: { courseId: course.id, slug: l.slug } },
          update: l,
          create: { ...l, courseId: course.id },
        });
      }
      console.log(`✅ Seed ${lessons.length} bài học cho khóa: ${course.title}`);
    }
  }

  // 5. Seed Thông báo hệ thống (System Announcements)
  const announcements = [
    {
      title: '🎉 Khai trương tính năng Shop & Khoá học lập trình thực chiến',
      content:
        'Hệ thống chính thức mở bán các gói Source Code chất lượng cao và tài khoản số giao dịch tức thì.',
      type: AnnouncementType.FEATURE,
      badge: 'MỚI',
      linkUrl: '/shop',
      linkText: 'Khám phá ngay',
      isActive: true,
      showBanner: true,
    },
    {
      title: '🎁 Mã giảm giá chào mừng: Giảm ngay 10% khi nhập WELCOME10',
      content: 'Ưu đãi 10% cho tất cả đơn hàng đầu tiên. Áp dụng cho cả Source Code và khoá học.',
      type: AnnouncementType.VOUCHER,
      badge: 'ƯU ĐÃI',
      linkUrl: '/shop',
      linkText: 'Dùng mã ngay',
      isActive: true,
      showBanner: true,
    },
  ];

  for (const ann of announcements) {
    const existing = await prisma.systemAnnouncement.findFirst({
      where: { title: ann.title },
    });
    if (!existing) {
      await prisma.systemAnnouncement.create({
        data: ann,
      });
    }
  }
  console.log(`✅ Seed ${announcements.length} thông báo hệ thống SystemAnnouncement`);

  // 6. Seed Community Post
  const commPostSlug = 'kinh-nghiem-toi-uu-toc-do-nextjs-15-lighthouse';
  await prisma.communityPost.upsert({
    where: { slug: commPostSlug },
    update: {},
    create: {
      slug: commPostSlug,
      authorId: admin.id,
      title: 'Kinh nghiệm tối ưu tốc độ Next.js 15 đạt 100 điểm Google Lighthouse',
      tags: ['nextjs', 'performance', 'seo', 'web-vitals'],
      category: 'cong-dong',
      status: CommunityPostStatus.PUBLISHED,
      indexable: true,
      coverUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800',
      contentHtml: `
<h2>1. Đặt vấn đề: Tại sao điểm Lighthouse lại quan trọng?</h2>
<p>Một website tải chậm hơn 3 giây có thể đánh mất đến 50% lượng truy cập tiềm năng. Google cũng đã đưa các chỉ số <strong>Core Web Vitals (LCP, INP, CLS)</strong> vào thuật toán xếp hạng tìm kiếm tự nhiên.</p>

<h2>2. Chiến lược tối ưu hình ảnh với Next/Image</h2>
<p>Thay vì load trực tiếp ảnh thô dung lượng hàng megabyte, hãy luôn sử dụng component <code>&lt;Image&gt;</code> được cấu hình kích thước chính xác và ưu tiên tải trước (priority) cho các ảnh trên màn hình đầu tiên.</p>

<h2>3. Tách biệt Server Component và Client Component</h2>
<p>Quy tắc vàng: Giữ cho component là Server Component cho đến khi bạn thật sự cần đến <code>useState</code>, <code>useEffect</code> hoặc các event listener của trình duyệt.</p>

<blockquote><p>Tối ưu hoá không phải là một công việc làm 1 lần rồi thôi, mà là thói quen liên tục trong quá trình phát triển dự án.</p></blockquote>
      `.trim(),
    },
  });
  console.log('✅ Seed 1 bài viết cộng đồng (CommunityPost) chuẩn SEO');

  // 7. Seed thêm Coupon hấp dẫn
  const extraCoupons = [
    {
      code: 'DEV2026',
      type: CouponType.PERCENT,
      value: 15,
      maxUses: 200,
      active: true,
    },
    {
      code: 'GIAM50K',
      type: CouponType.FIXED,
      value: 50000,
      maxUses: 100,
      active: true,
    },
  ];

  for (const c of extraCoupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
  }
  console.log(`✅ Seed ${extraCoupons.length} Mã giảm giá bổ sung (DEV2026, GIAM50K)`);

  console.log('✨ Toàn bộ dữ liệu mẫu đã được nạp thành công rực rỡ!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi nạp dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
