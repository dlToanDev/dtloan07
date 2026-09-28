import { PrismaClient, ProductStatus, ProductSaleMode, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('1. Cập nhật danh mục cat_apparel thành "Thời trang" (slug: thoi-trang)...');

  await prisma.productCategory.upsert({
    where: { id: 'cat_apparel' },
    update: {
      name: 'Thời trang',
      slug: 'thoi-trang',
    },
    create: {
      id: 'cat_apparel',
      name: 'Thời trang',
      slug: 'thoi-trang',
      sortOrder: 10,
      hasCondition: false,
    },
  });

  console.log('2. Nạp các sản phẩm Quần & Áo chất lượng cao cho danh mục Thời trang...');

  const fashionProducts = [
    {
      slug: 'quan-jogger-developer-co-gian-4-chieu',
      name: 'Quần Jogger Lập Trình Viên Co Giãn 4 Chiều (Kháng Nước, Đa Túi Đựng Phụ Kiện)',
      shortDesc:
        'Quần Jogger công thái học cho dân công nghệ ngồi code cả ngày: chất vải thun mè co giãn 4 chiều, chống nhăn, có túi khóa zip bảo vệ điện thoại.',
      description: `
### Chi tiết Quần Jogger Developer
Sản phẩm may đo riêng cho lập trình viên và người làm việc máy tính trong thời gian dài.

#### Ưu điểm vượt trội:
- **Chất liệu:** Thun polyeste dệt đan spandex co giãn 4 chiều, mềm mại, thoáng mát và khử mùi mồ hôi.
- **Thiết kế túi thông minh:** 2 túi trước sâu + 1 túi đùi có khoá kéo giấu kín để điện thoại, thẻ từ và tai nghe mà không bị cấn khi ngồi ghế công thái học.
- **Form dáng:** Slim-fit trẻ trung, gấu bo thun gọn gàng, phù hợp cả đi làm văn phòng lẫn thể thao cuối tuần.
      `.trim(),
      priceVnd: 320000,
      compareAtVnd: 490000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.PHYSICAL,
      categoryId: 'cat_apparel',
      version: '1.0.0',
      maxDownloads: 0,
      variants: [
        { name: 'Size M / Màu Đen', priceVnd: 320000, compareAtVnd: 490000, stock: 20 },
        { name: 'Size L / Màu Đen', priceVnd: 320000, compareAtVnd: 490000, stock: 25 },
        { name: 'Size XL / Màu Đen', priceVnd: 320000, compareAtVnd: 490000, stock: 15 },
      ],
    },
    {
      slug: 'quan-short-kaki-developer-streetwear',
      name: 'Quần Short Kaki Developer Năng Động (Chất Kaki Dày Dặn, Lưng Thun Co Giãn)',
      shortDesc:
        'Quần đùi short kaki phong cách tối giản thoải mái khi làm việc tại nhà (WFH), túi hộp sâu, cạp thun kèm dây rút tiện lợi.',
      description: `
### Chi tiết Quần Short Kaki WFH
Thoải mái tối đa trong những ngày làm việc từ xa hoặc sinh hoạt hàng ngày.

- Chất vải kaki cotton 100% đanh mịn, không xù lông
- Lưng thun co giãn êm ái kèm dây rút kim loại cao cấp
- Chiều dài ngang gối năng động
      `.trim(),
      priceVnd: 210000,
      compareAtVnd: 320000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.PHYSICAL,
      categoryId: 'cat_apparel',
      version: '1.0.0',
      maxDownloads: 0,
      variants: [
        { name: 'Size M / Xám Đậm', priceVnd: 210000, compareAtVnd: 320000, stock: 18 },
        { name: 'Size L / Xám Đậm', priceVnd: 210000, compareAtVnd: 320000, stock: 22 },
      ],
    },
    {
      slug: 'ao-thun-developer-git-push-force-and-pray',
      name: 'Áo Thun Developer "Git Push --Force And Pray" (Cotton 100% 250gsm)',
      shortDesc:
        'Áo phông cộc tay in câu quote bất hủ của dân IT, định lượng 250gsm dày dặn, thấm hút mồ hôi tốt, công nghệ in lụa bền bỉ.',
      description: `
### Chiếc áo thun hài hước cho mọi lập trình viên
Khẳng định cá tính coder trong mỗi buổi họp sprint hay demo dự án.

- Chất liệu: 100% Cotton Compact cao cấp chống co rút
- Cổ áo dệt bo rib dày dặn, không bai dão sau 50 lần giặt
- Thiết kế Unisex nam nữ mặc đều chuẩn form
      `.trim(),
      priceVnd: 199000,
      compareAtVnd: 299000,
      currency: 'VND',
      coverUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
      status: ProductStatus.ACTIVE,
      saleMode: ProductSaleMode.PAID,
      type: ProductType.PHYSICAL,
      categoryId: 'cat_apparel',
      version: '1.0.0',
      maxDownloads: 0,
      variants: [
        { name: 'Size M / Màu Trắng', priceVnd: 199000, compareAtVnd: 299000, stock: 30 },
        { name: 'Size L / Màu Trắng', priceVnd: 199000, compareAtVnd: 299000, stock: 35 },
        { name: 'Size XL / Màu Trắng', priceVnd: 199000, compareAtVnd: 299000, stock: 20 },
      ],
    },
  ];

  for (const item of fashionProducts) {
    const { variants, ...prodData } = item;
    const p = await prisma.product.upsert({
      where: { slug: prodData.slug },
      update: prodData,
      create: prodData,
    });

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v) continue;
      const existing = await prisma.productVariant.findFirst({
        where: { productId: p.id, name: v.name },
      });
      if (!existing) {
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
    console.log(`✅ Nạp sản phẩm: ${p.name}`);
  }

  // Cập nhật lại chiếc áo hoodie cũ sang cat_apparel nếu chưa
  await prisma.product.updateMany({
    where: { slug: 'ao-hoodie-lap-trinh-vien-eat-sleep-code' },
    data: { categoryId: 'cat_apparel' },
  });

  console.log('🎉 Hoàn tất cập nhật danh mục Thời trang và các sản phẩm Quần & Áo!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
