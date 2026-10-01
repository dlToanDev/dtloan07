import { db } from '../src/lib/db';

const vdsProducts = [
  {
    slug: 'cloud-vds-s',
    name: 'Cloud VDS S',
    shortDesc:
      '3 Physical Cores • 24 GB RAM • 180 GB NVMe • 250 Mbit/s Port (Dedicated Server ảo hóa)',
    priceVnd: 1815000,
    compareAtVnd: 2269000,
    coverUrl: '/images/products/cloud-vds-s.svg',
    warrantyNote: 'Bảo hành & cam kết tài nguyên phần cứng chuyên dụng 100% suốt chu kỳ sử dụng',
    description: `### Thông số kỹ thuật chi tiết Cloud VDS S:
- **CPU:** 3 Physical Cores (AMD EPYC 7282 2.8 GHz - Tài nguyên chuyên dụng không chia sẻ)
- **RAM:** 24 GB RAM ECC chuyên dụng
- **Ổ cứng:** 180 GB NVMe tốc độ cao chuẩn Enterprise
- **Băng thông mạng:** 250 Mbit/s Port
- **Lưu lượng truyền tải:** Không giới hạn dung lượng
- **Khởi tạo & Cài đặt:** Miễn phí khởi tạo, bàn giao nhanh chóng

---
### Ưu điểm vượt trội của dòng Cloud VDS:
- **Tài nguyên phần cứng riêng biệt 100%:** Khác với VPS thông thường chia sẻ core ảo hóa, Cloud VDS cấp trực tiếp nhân CPU vật lý (Physical Cores) chuyên dụng, không bị ảnh hưởng bởi tải của các máy khác trên cùng cụm node.
- **Tốc độ đọc/ghi NVMe vượt trội:** Phù hợp chạy database lớn, xử lý dữ liệu nặng, phần mềm render, máy chủ ứng dụng chịu tải cao.

---
### Hình thức bàn giao & Hỗ trợ:
> **Liên hệ tôi tự giao:** Sau khi xác nhận thanh toán/đơn hàng, quản trị viên sẽ chủ động liên hệ trực tiếp qua Zalo/Telegram hoặc số điện thoại của bạn để gửi thông tin bàn giao (IP tĩnh, Root password, SSH Port) và hỗ trợ cài đặt hệ điều hành (Ubuntu, Debian, AlmaLinux, Windows Server...) theo đúng nhu cầu sử dụng.
`,
  },
  {
    slug: 'cloud-vds-m',
    name: 'Cloud VDS M',
    shortDesc: '4 Physical Cores • 32 GB RAM • 240 GB NVMe • 500 Mbit/s Port (Hiệu năng cao)',
    priceVnd: 2295000,
    compareAtVnd: 2869000,
    coverUrl: '/images/products/cloud-vds-m.svg',
    warrantyNote: 'Bảo hành & cam kết tài nguyên phần cứng chuyên dụng 100% suốt chu kỳ sử dụng',
    description: `### Thông số kỹ thuật chi tiết Cloud VDS M:
- **CPU:** 4 Physical Cores (AMD EPYC 7282 2.8 GHz - Tài nguyên chuyên dụng không chia sẻ)
- **RAM:** 32 GB RAM ECC chuyên dụng
- **Ổ cứng:** 240 GB NVMe tốc độ cao chuẩn Enterprise
- **Băng thông mạng:** 500 Mbit/s Port
- **Lưu lượng truyền tải:** Không giới hạn dung lượng
- **Khởi tạo & Cài đặt:** Miễn phí khởi tạo, bàn giao nhanh chóng

---
### Ưu điểm vượt trội của dòng Cloud VDS:
- **Tài nguyên phần cứng riêng biệt 100%:** Cấp trực tiếp 4 nhân CPU vật lý (Physical Cores) AMD EPYC chuyên dụng, không bị ảnh hưởng bởi tải bên ngoài.
- **Tốc độ đọc/ghi NVMe vượt trội:** Phù hợp chạy cụm Microservices, hệ thống ERP, Game Server hoặc Database tải trung bình lớn.

---
### Hình thức bàn giao & Hỗ trợ:
> **Liên hệ tôi tự giao:** Sau khi xác nhận thanh toán/đơn hàng, quản trị viên sẽ chủ động liên hệ trực tiếp qua Zalo/Telegram hoặc số điện thoại của bạn để gửi thông tin bàn giao (IP tĩnh, Root password, SSH Port) và hỗ trợ cài đặt hệ điều hành (Ubuntu, Debian, AlmaLinux, Windows Server...) theo đúng nhu cầu sử dụng.
`,
  },
  {
    slug: 'cloud-vds-l',
    name: 'Cloud VDS L',
    shortDesc: '6 Physical Cores • 48 GB RAM • 360 GB NVMe • 750 Mbit/s Port (Cấu hình bán chạy)',
    priceVnd: 3191000,
    compareAtVnd: 3989000,
    coverUrl: '/images/products/cloud-vds-l.svg',
    warrantyNote: 'Bảo hành & cam kết tài nguyên phần cứng chuyên dụng 100% suốt chu kỳ sử dụng',
    description: `### Thông số kỹ thuật chi tiết Cloud VDS L (Cấu hình bán chạy):
- **CPU:** 6 Physical Cores (AMD EPYC 7282 2.8 GHz - Tài nguyên chuyên dụng không chia sẻ)
- **RAM:** 48 GB RAM ECC chuyên dụng
- **Ổ cứng:** 360 GB NVMe tốc độ cao chuẩn Enterprise
- **Băng thông mạng:** 750 Mbit/s Port tốc độ cao
- **Lưu lượng truyền tải:** Không giới hạn dung lượng
- **Khởi tạo & Cài đặt:** Miễn phí khởi tạo, bàn giao nhanh chóng

---
### Ưu điểm vượt trội của dòng Cloud VDS:
- **Tài nguyên phần cứng riêng biệt 100%:** 6 nhân CPU vật lý AMD EPYC mạnh mẽ cùng 48 GB RAM đáp ứng các workload nặng, phân tích dữ liệu, website thương mại điện tử lớn.
- **Băng thông 750 Mbit/s Port:** Đảm bảo kết nối thông suốt, độ trễ thấp và lưu lượng không giới hạn.

---
### Hình thức bàn giao & Hỗ trợ:
> **Liên hệ tôi tự giao:** Sau khi xác nhận thanh toán/đơn hàng, quản trị viên sẽ chủ động liên hệ trực tiếp qua Zalo/Telegram hoặc số điện thoại của bạn để gửi thông tin bàn giao (IP tĩnh, Root password, SSH Port) và hỗ trợ cài đặt hệ điều hành (Ubuntu, Debian, AlmaLinux, Windows Server...) theo đúng nhu cầu sử dụng.
`,
  },
  {
    slug: 'cloud-vds-xl',
    name: 'Cloud VDS XL',
    shortDesc: '8 Physical Cores • 64 GB RAM • 480 GB NVMe • 1 Gbit/s Port Siêu tốc',
    priceVnd: 4215000,
    compareAtVnd: 5269000,
    coverUrl: '/images/products/cloud-vds-xl.svg',
    warrantyNote: 'Bảo hành & cam kết tài nguyên phần cứng chuyên dụng 100% suốt chu kỳ sử dụng',
    description: `### Thông số kỹ thuật chi tiết Cloud VDS XL:
- **CPU:** 8 Physical Cores (AMD EPYC 7282 2.8 GHz - Tài nguyên chuyên dụng không chia sẻ)
- **RAM:** 64 GB RAM ECC chuyên dụng
- **Ổ cứng:** 480 GB NVMe tốc độ cao chuẩn Enterprise
- **Băng thông mạng:** 1 Gbit/s Port siêu tốc
- **Lưu lượng truyền tải:** Không giới hạn dung lượng
- **Khởi tạo & Cài đặt:** Miễn phí khởi tạo, bàn giao nhanh chóng

---
### Ưu điểm vượt trội của dòng Cloud VDS:
- **Cấu hình mạnh mẽ chuẩn Enterprise:** 8 Physical Cores EPYC và 64 GB RAM xử lý mượt mà các ứng dụng nặng, cụm Docker / Kubernetes, ứng dụng tài chính và truyền thông đa phương tiện.
- **Port mạng 1 Gbit/s:** Đường truyền siêu tốc, lý tưởng cho dịch vụ đòi hỏi băng thông lớn và ổn định liên tục.

---
### Hình thức bàn giao & Hỗ trợ:
> **Liên hệ tôi tự giao:** Sau khi xác nhận thanh toán/đơn hàng, quản trị viên sẽ chủ động liên hệ trực tiếp qua Zalo/Telegram hoặc số điện thoại của bạn để gửi thông tin bàn giao (IP tĩnh, Root password, SSH Port) và hỗ trợ cài đặt hệ điều hành (Ubuntu, Debian, AlmaLinux, Windows Server...) theo đúng nhu cầu sử dụng.
`,
  },
  {
    slug: 'cloud-vds-xxl',
    name: 'Cloud VDS XXL',
    shortDesc: '12 Physical Cores • 96 GB RAM • 720 GB NVMe • 1 Gbit/s Port (Tối đa sức mạnh)',
    priceVnd: 6215000,
    compareAtVnd: 7769000,
    coverUrl: '/images/products/cloud-vds-xxl.svg',
    warrantyNote: 'Bảo hành & cam kết tài nguyên phần cứng chuyên dụng 100% suốt chu kỳ sử dụng',
    description: `### Thông số kỹ thuật chi tiết Cloud VDS XXL (Tối đa sức mạnh):
- **CPU:** 12 Physical Cores (AMD EPYC 7282 2.8 GHz - Tài nguyên chuyên dụng không chia sẻ)
- **RAM:** 96 GB RAM ECC chuyên dụng
- **Ổ cứng:** 720 GB NVMe tốc độ cao chuẩn Enterprise
- **Băng thông mạng:** 1 Gbit/s Port siêu tốc
- **Lưu lượng truyền tải:** Không giới hạn dung lượng
- **Khởi tạo & Cài đặt:** Miễn phí khởi tạo, bàn giao nhanh chóng

---
### Ưu điểm vượt trội của dòng Cloud VDS:
- **Cấu hình cao cấp nhất (12 Cores / 96 GB RAM / 720 GB NVMe):** Thay thế hoàn hảo cho máy chủ vật lý riêng biệt (Dedicated Server) với chi phí tối ưu, độ tin cậy và khả năng uptime 99.99%.
- **Băng thông 1 Gbit/s Port:** Đáp ứng lưu lượng truy cập khổng lồ, xử lý video streaming, database phân tán và tác vụ AI/ML inference.

---
### Hình thức bàn giao & Hỗ trợ:
> **Liên hệ tôi tự giao:** Sau khi xác nhận thanh toán/đơn hàng, quản trị viên sẽ chủ động liên hệ trực tiếp qua Zalo/Telegram hoặc số điện thoại của bạn để gửi thông tin bàn giao (IP tĩnh, Root password, SSH Port) và hỗ trợ cài đặt hệ điều hành (Ubuntu, Debian, AlmaLinux, Windows Server...) theo đúng nhu cầu sử dụng.
`,
  },
];

async function main() {
  console.log('--- Bắt đầu thêm 5 gói Cloud VDS vào Shop ---');

  // 1. Tìm hoặc tạo Category "VDS"
  let category = await db.productCategory.findFirst({
    where: { slug: 'vds' },
  });

  if (!category) {
    category = await db.productCategory.create({
      data: {
        name: 'VDS',
        slug: 'vds',
        sortOrder: 20,
        hasCondition: false,
      },
    });
    console.log('Đã tạo danh mục VDS:', category.id);
  } else {
    console.log('Đã có danh mục VDS:', category.id);
  }

  for (const item of vdsProducts) {
    const product = await db.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        slug: item.slug,
        shortDesc: item.shortDesc,
        description: item.description,
        priceVnd: item.priceVnd,
        compareAtVnd: item.compareAtVnd,
        coverUrl: item.coverUrl,
        warrantyNote: item.warrantyNote,
        gallery: [item.coverUrl],
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
        gallery: [item.coverUrl],
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

  console.log('--- Hoàn tất thêm 5 gói Cloud VDS vào Shop! ---');
}

main()
  .catch((err) => {
    console.error('Lỗi khi seed VDS:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
