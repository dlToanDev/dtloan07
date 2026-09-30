import { db } from '../lib/db';

async function main() {
  const existing = await db.systemAnnouncement.findMany({
    orderBy: { createdAt: 'desc' },
  });
  console.log(`Found ${existing.length} existing announcements.`);
  for (const item of existing) {
    console.log(
      `- [${item.id}] ${item.title} (type: ${item.type}, game: ${item.gameType}, voucher: ${item.voucherCode})`,
    );
  }

  // Update existing WELCOME10 if it has no voucherCode
  await db.systemAnnouncement.updateMany({
    where: { title: { contains: 'WELCOME10' }, voucherCode: null },
    data: {
      voucherCode: 'WELCOME10',
      voucherDiscount: 'Giảm 10%',
      detailContent:
        'Nhập mã WELCOME10 khi thanh toán đơn hàng bất kỳ tại Shop để được giảm giá 10% ngay lập tức. Áp dụng cho mọi đơn hàng từ 50.000đ.',
    },
  });

  // Cập nhật Vòng quay may mắn với cấu hình ô 10%, 10k, 20%, 50k... và bảng Markdown
  await db.systemAnnouncement.updateMany({
    where: { gameType: 'LUCKY_WHEEL' },
    data: {
      gameConfig: JSON.stringify({
        segments: [
          { id: '1', label: '10%', code: 'SALE10', color: '#3b82f6', isWin: true },
          { id: '2', label: '10k', code: 'DEV10K', color: '#10b981', isWin: true },
          { id: '3', label: '20%', code: 'SALE20', color: '#8b5cf6', isWin: true },
          { id: '4', label: '50k', code: 'PRO50K', color: '#f59e0b', isWin: true },
          { id: '5', label: 'Freeship', code: 'FREESHIP', color: '#06b6d4', isWin: true },
          { id: '6', label: 'May mắn lần sau', code: '', color: '#64748b', isWin: false },
          { id: '7', label: '100k', code: 'VIP100K', color: '#ec4899', isWin: true },
          { id: '8', label: 'Giảm 15%', code: 'SAVE15', color: '#ef4444', isWin: true },
        ],
      }),
      detailContent: `🎡 **CHƯƠNG TRÌNH VÒNG QUAY MAY MẮN TRI ÂN KHÁCH HÀNG**

Chào mừng bạn đến với minigame Vòng quay may mắn của dtloan07! Hãy tham gia ngay để nhận các phần quà và voucher mua sắm cực khủng.

### 🎁 Bảng cơ cấu giải thưởng chi tiết:

| Ô trúng thưởng | Phần quà tương ứng | Thời hạn sử dụng |
| :--- | :--- | :--- |
| **Ô 10% & 10k** | Voucher giảm trực tiếp 10% hoặc 10.000đ | 7 ngày |
| **Ô 20% & 50k** | Voucher giảm 20% hoặc 50.000đ cho đơn từ 200k | 14 ngày |
| **Ô 100k** | Voucher VIP giảm 100.000đ áp dụng toàn bộ Shop | 30 ngày |
| **Ô Freeship** | Miễn phí giao hàng toàn quốc | 30 ngày |

### 📌 Thể lệ & Điều kiện tham gia:

| Tiêu chí | Quy định áp dụng |
| :--- | :--- |
| **Đối tượng** | Tất cả thành viên có tài khoản trên hệ thống |
| **Lượt quay** | Mỗi tài khoản có 1 lượt quay miễn phí mỗi ngày |
| **Cách dùng** | Sao chép mã voucher và dán vào ô giảm giá khi thanh toán tại Shop |`,
    },
  });

  // Cập nhật câu hỏi Quiz với bảng quy định
  await db.systemAnnouncement.updateMany({
    where: { gameType: 'QUIZ' },
    data: {
      gameConfig: JSON.stringify({
        question:
          'Framework CSS nào sử dụng triết lý utility-first phổ biến nhất hiện nay trong hệ sinh thái Next.js/React?',
        options: ['Bootstrap', 'Tailwind CSS', 'Ant Design', 'Bulma'],
        correctIndex: 1,
        rewardCode: 'QUIZDEV30',
        rewardDiscount: 'Giảm 30%',
      }),
      detailContent: `🧠 **THỬ THÁCH TRÍ TUỆ DÀNH CHO DEVELOPER**

Bạn có kiến thức vững vàng về công nghệ frontend hiện đại? Hãy cùng thử sức với câu đố trắc nghiệm dưới đây để rinh Voucher độc quyền!

### 📋 Bảng thể lệ & Quyền lợi:

| Hạng mục | Quy định chi tiết |
| :--- | :--- |
| **Nhiệm vụ** | Trả lời chính xác câu hỏi trắc nghiệm bên dưới |
| **Phần thưởng** | Voucher giảm ngay 30% áp dụng mọi sản phẩm Shop |
| **Thời hạn mã** | Có hiệu lực trong vòng 14 ngày kể từ khi mở khóa |
| **Áp dụng** | Thời trang lập trình, bàn phím cơ, phụ kiện công nghệ |`,
    },
  });

  // Check if we already have mini game announcements
  const hasWheel = existing.some((a) => a.gameType === 'LUCKY_WHEEL');
  const hasQuiz = existing.some((a) => a.gameType === 'QUIZ');

  if (!hasWheel) {
    console.log('Seeding Lucky Wheel announcement...');
    await db.systemAnnouncement.create({
      data: {
        title: 'Vòng quay may mắn: 100% Trúng quà & Voucher khủng',
        content:
          'Thử vận may với Vòng quay may mắn hôm nay để nhận ngay mã voucher giảm giá lên đến 50% khi mua sắm!',
        type: 'VOUCHER',
        badge: 'Vòng quay may mắn',
        linkUrl: '/shop',
        linkText: 'Khám phá Shop ngay',
        isActive: true,
        showBanner: true,
        voucherCode: 'LUCKY50',
        voucherDiscount: 'Giảm 50%',
        detailContent: `🎡 **CHƯƠNG TRÌNH VÒNG QUAY MAY MẮN TRI ÂN KHÁCH HÀNG**

Chào mừng bạn đến với minigame Vòng quay may mắn của dtloan07! 

### 🎁 Cơ cấu giải thưởng:
- **Voucher 50%**: Áp dụng cho mọi đơn hàng phụ kiện & thời trang lập trình viên.
- **Voucher 35%**: Giảm giá trực tiếp khi thanh toán đơn hàng bất kỳ.
- **Voucher 20% & 10%**: Không giới hạn giá trị tối thiểu.
- **Freeship Toàn Quốc**: Miễn phí vận chuyển tận nhà.

### 📌 Thể lệ & Điều kiện tham gia:
1. Mỗi khách hàng có lượt quay may mắn trong ngày.
2. Sau khi kim dừng ở ô quà, mã Voucher độc quyền sẽ hiển thị để bạn sao chép.
3. Mã có thời hạn áp dụng trong vòng 7 ngày. Hãy nhanh tay sử dụng tại gian hàng Shop nhé!`,
        gameType: 'LUCKY_WHEEL',
      },
    });
    console.log('Created Lucky Wheel announcement!');
  }

  if (!hasQuiz) {
    console.log('Seeding Quiz announcement...');
    await db.systemAnnouncement.create({
      data: {
        title: 'Đố vui Lập trình viên: Trả lời đúng nhận Voucher 30%',
        content:
          'Bạn tự tin với kiến thức lập trình của mình? Trả lời đúng câu hỏi trắc nghiệm dưới đây để nhận ngay voucher giảm 30%!',
        type: 'FEATURE',
        badge: 'Đố vui trúng quà',
        linkUrl: '/shop',
        linkText: 'Đến Shop dùng voucher',
        isActive: true,
        showBanner: false,
        voucherCode: 'QUIZDEV30',
        voucherDiscount: 'Giảm 30%',
        detailContent: `🧠 **THỬ THÁCH TRÍ TUỆ DÀNH RIÊNG CHO DEVELOPER**

Bạn có kiến thức vững vàng về công nghệ frontend hiện đại? Hãy cùng thử sức với câu đố trắc nghiệm dưới đây!

### 💡 Quy tắc tham gia:
- Đọc kỹ câu hỏi và chọn 1 đáp án chính xác nhất.
- Khi chọn đúng, mã Voucher giảm giá 30% độc quyền sẽ lập tức mở khóa.
- Áp dụng ngay cho các sản phẩm công nghệ, bàn phím cơ, áo thun dev tại Shop. Chúc bạn may mắn!`,
        gameType: 'QUIZ',
        gameConfig: JSON.stringify({
          question:
            'Framework CSS nào sử dụng triết lý "Utility-first" thịnh hành nhất hiện nay trong hệ sinh thái React / Next.js?',
          options: ['Bootstrap', 'Tailwind CSS', 'Bulma CSS', 'Foundation'],
          correctIndex: 1,
        }),
      },
    });
    console.log('Created Quiz announcement!');
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
