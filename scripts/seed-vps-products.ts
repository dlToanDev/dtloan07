import { db } from '../src/lib/db';

const vpsProducts = [
  {
    slug: 'cloud-vps-10',
    name: 'Cloud VPS 10',
    shortDesc: '4 vCPU Cores • 8 GB RAM • 100 GB SSD • 200 Mbit/s Port (Bàn giao tự động/thủ công)',
    priceVnd: 279000,
    compareAtVnd: 349000,
    coverUrl: '/images/products/cloud-vps-10.svg',
    warrantyNote: 'Bảo hành & hỗ trợ kỹ thuật suốt thời gian sử dụng gói VPS',
    description: `### Thông số kỹ thuật chi tiết Cloud VPS 10:
- **CPU:** 4 vCPU Cores
- **RAM:** 8 GB RAM
- **Ổ cứng:** 100 GB SSD tốc độ cao
- **Sao lưu:** 1 Snapshot an toàn
- **Băng thông mạng:** 200 Mbit/s Port
- **Lưu lượng:** Không giới hạn dung lượng truyền tải
- **Khởi tạo:** Miễn phí khởi tạo, cấu hình nhanh chóng

---
### Hình thức bàn giao & Hỗ trợ:
> **Liên hệ tôi tự giao:** Sau khi xác nhận đơn hàng, quản trị viên sẽ chủ động liên hệ trực tiếp qua Zalo/Telegram hoặc số điện thoại của bạn để gửi thông tin đăng nhập (IP, Root password, SSH Port) và hỗ trợ cài đặt OS (Ubuntu/Debian/CentOS), Docker, Nginx theo yêu cầu.
`,
  },
  {
    slug: 'cloud-vps-20',
    name: 'Cloud VPS 20',
    shortDesc:
      '6 vCPU Cores • 12 GB RAM • 100 GB NVMe / 200 GB SSD • 300 Mbit/s (Gói bán chạy nhất)',
    priceVnd: 399000,
    compareAtVnd: 499000,
    coverUrl: '/images/products/cloud-vps-20.svg',
    warrantyNote: 'Bảo hành & hỗ trợ kỹ thuật suốt thời gian sử dụng gói VPS',
    description: `### Thông số kỹ thuật chi tiết Cloud VPS 20 (Gói bán chạy nhất):
- **CPU:** 6 vCPU Cores
- **RAM:** 12 GB RAM
- **Ổ cứng:** 100 GB NVMe hoặc 200 GB SSD tốc độ cao
- **Sao lưu:** 2 Snapshots an toàn
- **Băng thông mạng:** 300 Mbit/s Port
- **Lưu lượng:** Không giới hạn dung lượng truyền tải
- **Khởi tạo:** Miễn phí khởi tạo, tối ưu hệ điều hành

---
### Hình thức bàn giao & Hỗ trợ:
> **Liên hệ tôi tự giao:** Sau khi xác nhận đơn hàng, quản trị viên sẽ chủ động liên hệ trực tiếp qua Zalo/Telegram hoặc số điện thoại của bạn để gửi thông tin đăng nhập (IP, Root password, SSH Port) và hỗ trợ cài đặt OS (Ubuntu/Debian/CentOS), Docker, Nginx theo yêu cầu.
`,
  },
  {
    slug: 'cloud-vps-30',
    name: 'Cloud VPS 30',
    shortDesc: '8 vCPU Cores • 24 GB RAM • 150 GB NVMe / 300 GB SSD • 600 Mbit/s Port',
    priceVnd: 639000,
    compareAtVnd: 799000,
    coverUrl: '/images/products/cloud-vps-30.svg',
    warrantyNote: 'Bảo hành & hỗ trợ kỹ thuật suốt thời gian sử dụng gói VPS',
    description: `### Thông số kỹ thuật chi tiết Cloud VPS 30:
- **CPU:** 8 vCPU Cores
- **RAM:** 24 GB RAM
- **Ổ cứng:** 150 GB NVMe hoặc 300 GB SSD tốc độ cao
- **Sao lưu:** 3 Snapshots an toàn
- **Băng thông mạng:** 600 Mbit/s Port
- **Lưu lượng:** Không giới hạn dung lượng truyền tải
- **Khởi tạo:** Miễn phí khởi tạo

---
### Hình thức bàn giao & Hỗ trợ:
> **Liên hệ tôi tự giao:** Sau khi xác nhận đơn hàng, quản trị viên sẽ chủ động liên hệ trực tiếp qua Zalo/Telegram hoặc số điện thoại của bạn để gửi thông tin đăng nhập (IP, Root password, SSH Port) và hỗ trợ cài đặt OS (Ubuntu/Debian/CentOS), Docker, Nginx theo yêu cầu.
`,
  },
  {
    slug: 'cloud-vps-40',
    name: 'Cloud VPS 40',
    shortDesc: '12 vCPU Cores • 48 GB RAM • 200 GB NVMe / 400 GB SSD • 800 Mbit/s Port',
    priceVnd: 1039000,
    compareAtVnd: 1299000,
    coverUrl: '/images/products/cloud-vps-40.svg',
    warrantyNote: 'Bảo hành & hỗ trợ kỹ thuật suốt thời gian sử dụng gói VPS',
    description: `### Thông số kỹ thuật chi tiết Cloud VPS 40:
- **CPU:** 12 vCPU Cores
- **RAM:** 48 GB RAM
- **Ổ cứng:** 200 GB NVMe hoặc 400 GB SSD tốc độ cao
- **Sao lưu:** 3 Snapshots an toàn
- **Băng thông mạng:** 800 Mbit/s Port
- **Lưu lượng:** Không giới hạn dung lượng truyền tải
- **Khởi tạo:** Miễn phí khởi tạo

---
### Hình thức bàn giao & Hỗ trợ:
> **Liên hệ tôi tự giao:** Sau khi xác nhận đơn hàng, quản trị viên sẽ chủ động liên hệ trực tiếp qua Zalo/Telegram hoặc số điện thoại của bạn để gửi thông tin đăng nhập (IP, Root password, SSH Port) và hỗ trợ cài đặt OS (Ubuntu/Debian/CentOS), Docker, Nginx theo yêu cầu.
`,
  },
  {
    slug: 'cloud-vps-50',
    name: 'Cloud VPS 50',
    shortDesc: '16 vCPU Cores • 64 GB RAM • 250 GB NVMe / 500 GB SSD • 1 Gbit/s Port',
    priceVnd: 1439000,
    compareAtVnd: 1799000,
    coverUrl: '/images/products/cloud-vps-50.svg',
    warrantyNote: 'Bảo hành & hỗ trợ kỹ thuật suốt thời gian sử dụng gói VPS',
    description: `### Thông số kỹ thuật chi tiết Cloud VPS 50:
- **CPU:** 16 vCPU Cores
- **RAM:** 64 GB RAM
- **Ổ cứng:** 250 GB NVMe hoặc 500 GB SSD tốc độ cao
- **Sao lưu:** 3 Snapshots an toàn
- **Băng thông mạng:** 1 Gbit/s Port siêu tốc
- **Lưu lượng:** Không giới hạn dung lượng truyền tải
- **Khởi tạo:** Miễn phí khởi tạo

---
### Hình thức bàn giao & Hỗ trợ:
> **Liên hệ tôi tự giao:** Sau khi xác nhận đơn hàng, quản trị viên sẽ chủ động liên hệ trực tiếp qua Zalo/Telegram hoặc số điện thoại của bạn để gửi thông tin đăng nhập (IP, Root password, SSH Port) và hỗ trợ cài đặt OS (Ubuntu/Debian/CentOS), Docker, Nginx theo yêu cầu.
`,
  },
  {
    slug: 'cloud-vps-60',
    name: 'Cloud VPS 60',
    shortDesc:
      '18 vCPU Cores • 96 GB RAM • 300 GB NVMe / 600 GB SSD • 1 Gbit/s Port (Hiệu năng cực đại)',
    priceVnd: 1919000,
    compareAtVnd: 2399000,
    coverUrl: '/images/products/cloud-vps-60.svg',
    warrantyNote: 'Bảo hành & hỗ trợ kỹ thuật suốt thời gian sử dụng gói VPS',
    description: `### Thông số kỹ thuật chi tiết Cloud VPS 60 (Hiệu năng tối đa):
- **CPU:** 18 vCPU Cores
- **RAM:** 96 GB RAM
- **Ổ cứng:** 300 GB NVMe hoặc 600 GB SSD tốc độ cao
- **Sao lưu:** 3 Snapshots an toàn
- **Băng thông mạng:** 1 Gbit/s Port siêu tốc
- **Lưu lượng:** Không giới hạn dung lượng truyền tải
- **Khởi tạo:** Miễn phí khởi tạo

---
### Hình thức bàn giao & Hỗ trợ:
> **Liên hệ tôi tự giao:** Sau khi xác nhận đơn hàng, quản trị viên sẽ chủ động liên hệ trực tiếp qua Zalo/Telegram hoặc số điện thoại của bạn để gửi thông tin đăng nhập (IP, Root password, SSH Port) và hỗ trợ cài đặt OS (Ubuntu/Debian/CentOS), Docker, Nginx theo yêu cầu.
`,
  },
];

async function main() {
  console.log('--- Bắt đầu thêm 6 gói Cloud VPS vào Shop ---');

  // 1. Tìm hoặc tạo Category "VPS"
  let category = await db.productCategory.findFirst({
    where: { slug: 'vps' },
  });

  if (!category) {
    category = await db.productCategory.create({
      data: {
        name: 'VPS',
        slug: 'vps',
        sortOrder: 10,
        hasCondition: false,
      },
    });
    console.log('Đã tạo danh mục VPS:', category.id);
  } else {
    console.log('Đã có danh mục VPS:', category.id);
  }

  // 2. Cập nhật VPS10 cũ thành Cloud VPS 10 nếu có
  const existingVps10 = await db.product.findFirst({
    where: {
      OR: [{ slug: 'vps10' }, { slug: 'cloud-vps-10' }],
    },
  });

  for (const item of vpsProducts) {
    const isFirst = item.slug === 'cloud-vps-10';
    const targetId = isFirst && existingVps10 ? existingVps10.id : undefined;

    const product = await db.product.upsert({
      where: targetId ? { id: targetId } : { slug: item.slug },
      update: {
        name: item.name,
        slug: item.slug,
        shortDesc: item.shortDesc,
        description: item.description,
        priceVnd: item.priceVnd,
        compareAtVnd: item.compareAtVnd,
        coverUrl: item.coverUrl,
        warrantyNote: item.warrantyNote,
        gallery: ['/images/posts/gemini-generated-image-bxbs8nbxbs8nbxbs-a117e66d.png'],
        type: 'ACCOUNT',
        deliveryMode: 'MANUAL',
        saleMode: 'PAID',
        status: 'ACTIVE',
        version: '1.0.0',
        categoryId: category.id,
      },
      create: {
        name: item.name,
        slug: item.slug,
        shortDesc: item.shortDesc,
        description: item.description,
        priceVnd: item.priceVnd,
        compareAtVnd: item.compareAtVnd,
        coverUrl: item.coverUrl,
        warrantyNote: item.warrantyNote,
        gallery: ['/images/posts/gemini-generated-image-bxbs8nbxbs8nbxbs-a117e66d.png'],
        type: 'ACCOUNT',
        deliveryMode: 'MANUAL',
        saleMode: 'PAID',
        status: 'ACTIVE',
        version: '1.0.0',
        categoryId: category.id,
      },
      include: { variants: true },
    });

    // Tạo hoặc cập nhật variant mặc định
    if (product.variants.length === 0) {
      await db.productVariant.create({
        data: {
          productId: product.id,
          name: 'Kỳ hạn 12 tháng (Giá ưu đãi)',
          priceVnd: item.priceVnd,
          compareAtVnd: item.compareAtVnd,
          stock: 50,
          sortOrder: 0,
          active: true,
        },
      });
      console.log(`Đã tạo variant mặc định cho ${item.name}`);
    } else {
      await db.productVariant.update({
        where: { id: product.variants[0]!.id },
        data: {
          name: 'Kỳ hạn 12 tháng (Giá ưu đãi)',
          priceVnd: item.priceVnd,
          compareAtVnd: item.compareAtVnd,
          stock: 50,
          active: true,
        },
      });
      console.log(`Đã cập nhật variant cho ${item.name}`);
    }

    console.log(
      `✓ Đã thêm/cập nhật: ${item.name} (${item.slug}) - ${item.priceVnd.toLocaleString('vi-VN')} đ`,
    );
  }

  console.log('--- Hoàn tất thêm 6 gói Cloud VPS vào Shop! ---');
}

main()
  .catch((err) => {
    console.error('Lỗi khi seed sản phẩm:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
