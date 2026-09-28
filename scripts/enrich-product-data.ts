import { db } from '../src/lib/db';

async function main() {
  console.log('Enriching products with multi-image gallery & detailed descriptions...');

  const updates = [
    {
      slug: 'quan-jogger-developer-co-gian-4-chieu',
      coverUrl: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=1000&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=1000&q=80',
        'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=1000&q=80',
        'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1000&q=80',
        'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=1000&q=80',
      ],
      description: `### 👖 Giới thiệu Quần Jogger Developer Pro 2026

Quần Jogger Developer Pro được nghiên cứu và thiết kế chuyên biệt cho giới lập trình viên, kỹ sư phần mềm và những người làm việc với máy tính liên tục trên 8 tiếng mỗi ngày.

#### ✨ Điểm nổi bật & Tính năng vượt trội
* **Chất liệu vải Tech-Stretch 4D:** Sự pha trộn hoàn hảo giữa 88% Polyester dệt mật độ cao và 12% Spandex co giãn 4 chiều, giúp đứng lên, ngồi xuống, gác chân lên ghế công thái học mà hoàn toàn không bị cấn hay bó sát.
* **Công nghệ kháng nước nhẹ Hydro-Shield:** Chống thấm các giọt nước trà, cafe vô tình bắn vào khi đang tập trung gõ code.
* **Hệ thống 4 túi thông minh:**
  * 2 túi trước chéo sâu, giữ điện thoại màn hình 6.7 inch không bao giờ rơi ra khi ngồi.
  * 1 túi bên đùi có khóa kéo giấu kín chống trộm (Hidden Zipper) để đựng thẻ từ văn phòng, ví mỏng hoặc AirTag.
  * 1 túi sau có cúc bấm nam châm tiện lợi.
* **Gấu quần bo thun thể thao:** Ôm vừa vặn cổ chân, kết hợp cùng sneaker mang lại diện mạo năng động, lịch thiệp khi đi làm văn phòng hoặc ra quán cafe làm việc.

---

#### 📏 Bảng quy đổi Size chuẩn Việt Nam

| Size | Chiều cao phù hợp | Cân nặng phù hợp | Vòng eo (cm) | Dài quần (cm) |
| :---: | :---: | :---: | :---: | :---: |
| **M** | 1m60 - 1m68 | 50 - 62 kg | 68 - 76 | 94 |
| **L** | 1m68 - 1m75 | 63 - 72 kg | 76 - 84 | 97 |
| **XL** | 1m75 - 1m82 | 73 - 82 kg | 84 - 92 | 100 |
| **XXL** | Trên 1m80 | 83 - 95 kg | 92 - 100 | 102 |

---

#### 🧼 Hướng dẫn bảo quản & Giặt ủi
* Giặt bằng nước lạnh hoặc nước ấm dưới 35 độ C để giữ độ đàn hồi tốt nhất cho sợi Spandex.
* Không dùng chất tẩy rửa mạnh hoặc thuốc tẩy trực tiếp lên vải.
* Lộn trái quần khi phơi dưới ánh nắng nhẹ, tránh phơi trực tiếp dưới nắng gắt trưa hè.
* Là/ủi ở nhiệt độ trung bình (chế độ sợi tổng hợp) nếu cần.`,
    },
    {
      slug: 'ao-hoodie-lap-trinh-vien-eat-sleep-code',
      coverUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1000&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1000&q=80',
        'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=1000&q=80',
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&q=80',
        'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1000&q=80',
      ],
      description: `### 🧥 Áo Hoodie Developer "Eat Sleep Code Repeat"

Chiếc áo hoodie biểu tượng của văn hóa Hacker, mang lại cảm giác ấm áp, tập trung và bảo vệ bạn khỏi điều hòa lạnh buốt ở các phòng máy server hay văn phòng IT.

#### ✨ Ưu điểm nổi bật
* **Định lượng vải 380 GSM Cotton Blend:** Vải nỉ bông siêu dày dặn, lớp bông mịn bên trong không rụng lông, không để lại bụi vải trên áo sơ mi hay áo thun lót bên trong.
* **Mũ trùm 2 lớp có dây rút dập kim loại:** Giữ ấm tuyệt đối vùng đầu và tai khi đi xe máy hoặc khi cần trùm mũ nghe nhạc chống ồn để tập trung fix bug.
* **Túi Kangaroo trước bụng:** Cực kỳ rộng rãi, có thể đựng vừa cả bàn phím cơ 65%, chuột, điện thoại và giữ ấm đôi bàn tay.
* **Mực in dẻo Silicon cao cấp:** Công nghệ in pet nhiệt sắc nét, giặt máy thoải mái không lo bong tróc hay phai màu sau 100 lần giặt.

---

#### 📏 Bảng thông số Size Unisex

| Size | Chiều cao | Cân nặng | Rộng ngực (cm) | Dài áo (cm) |
| :---: | :---: | :---: | :---: | :---: |
| **M (Oversize)** | 1m58 - 1m68 | 48 - 60 kg | 116 | 68 |
| **L (Oversize)** | 1m68 - 1m76 | 61 - 72 kg | 122 | 72 |
| **XL (Oversize)** | 1m75 - 1m85 | 73 - 88 kg | 128 | 75 |

---

#### 🛡️ Chính sách cam kết
* Đổi size miễn phí tận nhà trong vòng 7 ngày nếu không vừa.
* Hoàn tiền 100% nếu phát hiện bai dão hoặc xù lông nghiêm trọng.`,
    },
    {
      slug: 'ao-thun-developer-git-push-force-and-pray',
      coverUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1000&q=80',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1000&q=80',
        'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=1000&q=80',
      ],
      description: `### 👕 Áo Thun Developer "Git Push --Force And Pray"

Thiết kế độc quyền dí dỏm dành cho các kỹ sư phần mềm. Một câu đùa bất hủ nhắc nhở sự cẩn trọng khi release code lên production!

#### ✨ Đặc tính sản phẩm
* **100% Cotton 2 chiều định lượng 250 GSM:** Dày dặn chuẩn form Âu Mỹ, thấm hút mồ hôi cực tốt, đứng dáng áo không bị rũ.
* **Bo cổ dày 2.5cm dệt viền gân:** Đảm bảo giặt máy không bao giờ bị nhão hay quăn mép cổ áo.
* **Đường may móc xích đôi (Double Needle):** Tăng cường độ chịu lực ở vai, nách và gấu áo.

---

#### 📏 Bảng Size Áo Thun

| Size | Chiều cao | Cân nặng | Rộng vai (cm) | Dài áo (cm) |
| :---: | :---: | :---: | :---: | :---: |
| **S** | 1m50 - 1m62 | 45 - 54 kg | 48 | 66 |
| **M** | 1m63 - 1m70 | 55 - 65 kg | 51 | 70 |
| **L** | 1m71 - 1m78 | 66 - 76 kg | 54 | 73 |
| **XL** | 1m78 - 1m86 | 77 - 90 kg | 57 | 76 |`,
    },
    {
      slug: 'ban-phim-co-keychron-k2-pro-wireless',
      coverUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1000&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1000&q=80',
        'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=1000&q=80',
        'https://images.unsplash.com/photo-1595225476474-87563907a212?w=1000&q=80',
        'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=1000&q=80',
      ],
      description: `### ⌨️ Bàn phím cơ Keychron K2 Pro QMK/VIA Không Dây

Bàn phím cơ công thái học hoàn hảo cho lập trình viên và người viết lách chuyên nghiệp. Cho phép remap toàn bộ phím bấm dễ dàng qua trình duyệt với firmware QMK/VIA.

#### ⚙️ Thông số kỹ thuật chi tiết
* **Layout:** 75% (84 phím) tối ưu không gian bàn làm việc nhưng vẫn giữ trọn hàng phím F và cụm điều hướng độc lập.
* **Switch:** Gateron G Pro Red Switch đã được lube sẵn từ nhà máy, lực nhấn 45g cực kỳ êm ái, gõ đêm không làm phiền người xung quanh.
* **Mạch Hotswap 5-pin:** Hỗ trợ thay thế mọi switch cơ học chuẩn MX trên thị trường (Cherry, Gateron, Kailh, Akko...) mà không cần mối hàn.
* **Keycap PBT Double-shot:** Profile OSA độ cong thoải mái, chất nhựa PBT không bao giờ bóng dầu hay bay chữ theo thời gian.
* **Kết nối đa nền tảng:**
  * Bluetooth 5.1 kết nối và chuyển đổi nhanh giữa 3 thiết bị (Mac, Windows, iPad, Android).
  * Cáp Type-C rời mạ vàng với tần số phản hồi 1000Hz phục vụ cả chơi game và làm việc ổn định.
* **Thời lượng Pin:** 4000mAh cho thời gian làm việc liên tục đến 300 giờ (khi tắt LED) hoặc 100 giờ với LED RGB.`,
    },
    {
      slug: 'lot-chuot-developer-shortcuts-vscode-linux',
      coverUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=1000&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=1000&q=80',
        'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=1000&q=80',
        'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=1000&q=80',
      ],
      description: `### 🖱️ Deskmat Developer: Phím tắt VS Code & Cheatsheet Linux

Tấm lót bàn làm việc cỡ lớn vừa bảo vệ mặt bàn, vừa là bách khoa toàn thư phím tắt ngay trước tầm mắt của bạn!

#### ✨ Đặc điểm nổi bật
* **Kích thước cực đại 900 x 400 x 4 mm:** Đủ chỗ để cả bàn phím fullsize, chuột và ly nước một cách thoải mái.
* **Nội dung in sắc nét:** Tổng hợp hơn 100 phím tắt quan trọng nhất của VS Code, Git, Vim, Docker và câu lệnh Linux cơ bản.
* **Bề mặt vải Speed kết hợp Control:** Lướt chuột mượt mà, cảm biến quang học bắt điểm chính xác tuyệt đối.
* **Đế cao su thiên nhiên chống trượt:** Bám dính chắc chắn trên mặt bàn gỗ, kính, kim loại.
* **Bo viền chỉ dù 360 độ:** Chống bong mép và rách rưới sau nhiều năm sử dụng.`,
    },
    {
      slug: 'tai-khoan-chatgpt-plus-1-thang',
      coverUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1000&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1000&q=80',
        'https://images.unsplash.com/photo-1676299081847-824916de030a?w=1000&q=80',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&q=80',
      ],
      description: `### 🤖 Tài Khoản ChatGPT Plus Chính Chủ OpenAI (1 Tháng)

Nâng cấp trải nghiệm AI đỉnh cao với mô hình GPT-4o, OpenAI o1-preview và công cụ phân tích dữ liệu nâng cao (Advanced Data Analysis).

#### ✨ Quyền lợi đặc quyền của gói Plus
* Truy cập không giới hạn mô hình GPT-4o với tốc độ phản hồi cực nhanh.
* Mô hình suy luận logic chuyên sâu OpenAI o1 (phục vụ giải toán, debug code phức tạp).
* Tạo ảnh nghệ thuật không giới hạn với DALL-E 3.
* Duyệt web tìm kiếm dữ liệu thời gian thực (Web Browsing).
* Sử dụng kho Custom GPTs phong phú và tự xây dựng trợ lý AI cho riêng bạn.

#### 🛡️ Quy trình bàn giao & Bảo hành
* **Hình thức bàn giao:** Nâng cấp trực tiếp trên email chính chủ của bạn hoặc cấp tài khoản riêng biệt.
* **Bảo hành:** Cam kết 1 đổi 1 trong suốt 30 ngày nếu xảy ra lỗi do hệ thống.`,
    },
    {
      slug: 'saas-nextjs-starter-kit-pro',
      coverUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&q=80',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80',
        'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1000&q=80',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&q=80',
      ],
      description: `### 🚀 Fullstack SaaS Starter Kit Next.js 15 Pro (App Router)

Bộ mã nguồn hoàn chỉnh giúp bạn tiết kiệm hơn 200 giờ code các tính năng boilerplate để ra mắt sản phẩm SaaS kiếm tiền chỉ trong 48 giờ!

#### 🛠️ Tech Stack đỉnh cao
* **Frontend:** Next.js 15 App Router, React 19, Tailwind CSS v4, Radix UI & Shadcn UI.
* **Backend & Database:** PostgreSQL, Prisma ORM, Server Actions với Zod validation an toàn tuyệt đối.
* **Authentication:** NextAuth v5 (Auth.js) hỗ trợ OAuth Google, GitHub và Magic Link.
* **Thanh toán:** Tích hợp sẵn cổng thanh toán PayOS (QR Code VietQR) và Stripe Checkout.
* **Email hệ thống:** Resend API & React Email template đẹp mắt.
* **SEO & Analytics:** Metadata API động, OpenGraph generator, Google Analytics & PostHog.`,
    },
  ];

  for (const item of updates) {
    await db.product.update({
      where: { slug: item.slug },
      data: {
        coverUrl: item.coverUrl,
        gallery: item.gallery,
        description: item.description,
      },
    });
    console.log(`Updated product: ${item.slug}`);
  }

  console.log('Enrichment finished successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
