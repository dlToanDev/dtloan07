import {
  PrismaClient,
  ProductStatus,
  ProductSaleMode,
  ProductType,
  DeliveryMode,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Nạp thêm sản phẩm để trang Shop vượt mốc 10 sản phẩm (hiển thị phân trang 1, 2)...');

  const products = [
    {
      slug: 'fullstack-microservices-starter-nestjs-nextjs',
      name: 'Fullstack Microservices Starter Kit (NestJS + Next.js 15 + RabbitMQ)',
      shortDesc:
        'Kiến trúc Microservices thực chiến: Gateway Kong, Event-driven RabbitMQ, NestJS Microservices, Next.js 15 Dashboard và Docker Compose hoàn chỉnh.',
      description: `
### Kiến trúc Microservices cho doanh nghiệp
Bộ source code chuẩn cấu trúc enterprise giúp bạn phân tách module rành mạch và mở rộng hệ thống theo chiều ngang (horizontal scaling).

- API Gateway với rate limiting
- Event Bus với RabbitMQ & Redis Pub/Sub
- Dashboard Next.js 15 App Router
- Giám sát Prometheus & Grafana tích hợp sẵn
      `.trim(),
      priceVnd: 690000,
      compareAtVnd: 1200000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.DOWNLOAD,
      categoryId: 'cat_source_code',
      version: '1.5.0',
      maxDownloads: 5,
      variants: [
        { name: 'Mặc định (Full Source)', priceVnd: 690000, compareAtVnd: 1200000, stock: null },
      ],
    },
    {
      slug: 'tai-khoan-github-copilot-pro-1-nam',
      name: 'Bản quyền GitHub Copilot Pro Dành Cho Lập Trình Viên (1 Năm)',
      shortDesc:
        'Trợ lý lập trình AI chính thức từ GitHub: gợi ý code tự động theo ngữ cảnh, hỗ trợ Copilot Chat trong VS Code, JetBrains và Xcode.',
      description: `
### GitHub Copilot Pro - Người bạn đồng hành cùng Dev
Nâng cao hiệu suất code lên gấp đôi với sự hỗ trợ của mô hình GPT-4o chuyên biệt cho lập trình.

- Tương thích tốt nhất với VS Code và JetBrains
- Hỗ trợ đầy đủ Copilot CLI và Copilot Chat trong IDE
- Bảo hành 1 đổi 1 suốt 12 tháng
      `.trim(),
      priceVnd: 450000,
      compareAtVnd: 1200000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.ACCOUNT,
      categoryId: 'cat_account',
      deliveryMode: DeliveryMode.MANUAL,
      warrantyNote: 'Bảo hành 1 năm kể từ thời điểm bàn giao',
      version: '1.0.0',
      maxDownloads: 1,
      variants: [{ name: 'Gói 1 Năm', priceVnd: 450000, compareAtVnd: 1200000, stock: 10 }],
    },
    {
      slug: 'lot-chuot-developer-shortcuts-vscode-linux',
      name: 'Lót chuột cỡ lớn (90x40cm) in phím tắt VS Code & Lệnh Linux',
      shortDesc:
        'Pad chuột công thái học bề mặt speed siêu mượt, bo viền chống tưa, in bảng phím tắt VS Code, Git và hơn 50 lệnh Linux thông dụng.',
      description: `
### Bàn làm việc đậm chất kỹ thuật
Không bao giờ phải mất công Google tìm kiếm cú pháp phím tắt hay câu lệnh Linux mỗi khi thao tác trên terminal.

- Kích thước: 900 x 400 x 4 mm
- Đế cao su tự nhiên bám dính bàn cực tốt
- Bề mặt vải dệt mật độ cao chống bám nước
      `.trim(),
      priceVnd: 129000,
      compareAtVnd: 199000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.PHYSICAL,
      categoryId: 'cat_accessory',
      version: '1.0.0',
      maxDownloads: 0,
      variants: [
        { name: 'VS Code & Linux (Đen / Xám)', priceVnd: 129000, compareAtVnd: 199000, stock: 25 },
      ],
    },
    {
      slug: 'mu-bucket-developer-git-commit',
      name: 'Mũ Bucket Developer Thêu Biểu Tượng "Git Commit"',
      shortDesc:
        'Nón bucket phong cách streetwear tối giản cho dân công nghệ, chất vải kaki cotton 2 lớp thoáng mát, form đứng năng động.',
      description: `
### Chiếc mũ của phong cách lập trình
Phụ kiện không thể thiếu trong các buổi Hackathon hay dạo phố cuối tuần.

- Vải kaki cotton 100% thấm hút mồ hôi
- Logo Git thêu nổi 3D tinh tế phía trước
- Freesize chu vi vòng đầu 56-58cm
      `.trim(),
      priceVnd: 135000,
      compareAtVnd: 220000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.PHYSICAL,
      categoryId: 'cat_hat',
      version: '1.0.0',
      maxDownloads: 0,
      variants: [
        { name: 'Màu Đen / Logo Trắng', priceVnd: 135000, compareAtVnd: 220000, stock: 15 },
        { name: 'Màu Be / Logo Đen', priceVnd: 135000, compareAtVnd: 220000, stock: 12 },
      ],
    },
  ];

  for (const item of products) {
    const { variants, ...prodData } = item;
    const p = await prisma.product.upsert({
      where: { slug: prodData.slug },
      update: prodData,
      create: prodData,
    });

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v) continue;
      const existingV = await prisma.productVariant.findFirst({
        where: { productId: p.id, name: v.name },
      });
      if (!existingV) {
        await prisma.productVariant.create({
          data: {
            productId: p.id,
            name: v.name,
            priceVnd: v.priceVnd,
            compareAtVnd: v.compareAtVnd,
            stock: v.stock,
            sortOrder: i,
          },
        });
      }
    }
    console.log(`✅ Thêm sản phẩm: ${p.name}`);
  }

  const total = await prisma.product.count({ where: { status: 'ACTIVE' } });
  console.log(
    `🎉 Tổng số sản phẩm đang bán trong Shop: ${total} (Đã vượt mốc 10 sản phẩm để phân trang!)`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
