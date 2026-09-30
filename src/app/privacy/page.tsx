import { Container } from '@/components/layout/container';
import { siteConfig } from '@/config/site';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description: 'Cam kết bảo mật thông tin cá nhân và dữ liệu người dùng trên blog.',
};

export default function PrivacyPage() {
  return (
    <Container className="max-w-3xl py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold tracking-tight">Chính sách bảo mật</h1>
        <p className="text-muted-foreground text-sm">Cập nhật lần cuối: 16/09/2026</p>

        <h2>1. Thu thập thông tin</h2>
        <p>
          {siteConfig.name} coi trọng sự riêng tư của bạn. Chúng tôi chỉ thu thập các thông tin tối
          thiểu cần thiết để cung cấp dịch vụ:
        </p>
        <ul>
          <li>
            <strong>Địa chỉ Email:</strong> Khi bạn đăng ký nhận bản tin (Newsletter), nhận tài liệu
            miễn phí (Lead Magnet) hoặc khi bạn đặt mua sản phẩm số.
          </li>
          <li>
            <strong>Dữ liệu giao dịch:</strong> Mã đơn hàng, số tiền, ngày giờ giao dịch và trạng
            thái thanh toán từ cổng PayOS. Chúng tôi tuyệt đối{' '}
            <em>không lưu trữ thông tin thẻ hay mật khẩu tài khoản ngân hàng</em>.
          </li>
          <li>
            <strong>Nhật ký kỹ thuật:</strong> Địa chỉ IP và User-Agent khi bạn tải file sản phẩm
            nhằm mục đích bảo vệ bản quyền và phát hiện hành vi truy cập trái phép.
          </li>
        </ul>

        <h2>2. Sử dụng thông tin</h2>
        <p>Thông tin của bạn được sử dụng cho các mục đích sau:</p>
        <ul>
          <li>Gửi mã bản quyền, đường dẫn tải file và hoá đơn xác nhận đơn hàng.</li>
          <li>Gửi bản tin công nghệ, bài viết chuyên sâu và thông báo cập nhật phiên bản mới.</li>
          <li>Hỗ trợ kỹ thuật và giải quyết các thắc mắc liên quan đến sản phẩm.</li>
        </ul>

        <h2>3. Quyền huỷ đăng ký (Opt-out / Unsubscribe)</h2>
        <p>
          Bạn có toàn quyền dừng nhận email bất kỳ lúc nào bằng cách nhấp vào liên kết{' '}
          <strong>Hủy đăng ký</strong> ở cuối mỗi email gửi đi hoặc truy cập trang{' '}
          <Link href="/unsubscribe">Huỷ nhận tin</Link> của chúng tôi.
        </p>

        <h2>4. Bảo mật dữ liệu</h2>
        <p>
          Mọi dữ liệu thanh toán được mã hoá an toàn qua giao thức HTTPS / TLS 1.3 và chữ ký HMAC
          SHA256. Chúng tôi không bao giờ bán, trao đổi hoặc chia sẻ thông tin cá nhân của bạn cho
          bất kỳ bên thứ ba nào vì mục đích quảng cáo thương mại.
        </p>
      </article>
    </Container>
  );
}
