import { Container } from '@/components/layout/container';
import { siteConfig } from '@/config/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng & Chính sách hoàn tiền',
  description:
    'Các điều khoản dịch vụ, bản quyền phần mềm và chính sách hoàn tiền cho sản phẩm số.',
};

export default function TermsPage() {
  return (
    <Container className="max-w-3xl py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold tracking-tight">
          Điều khoản sử dụng & Chính sách hoàn tiền
        </h1>
        <p className="text-muted-foreground text-sm">Cập nhật lần cuối: 16/09/2026</p>

        <h2>1. Quy định chung</h2>
        <p>
          Chào mừng bạn đến với {siteConfig.name}. Khi truy cập trang web hoặc mua bất kỳ sản phẩm
          số nào trên hệ thống của chúng tôi, bạn đồng ý tuân thủ các điều khoản và điều kiện được
          nêu dưới đây.
        </p>

        <h2>2. Bản quyền & Giấy phép sử dụng sản phẩm số (License)</h2>
        <ul>
          <li>
            Mỗi đơn hàng thành công sẽ được cấp một <strong>License Key</strong> độc nhất.
          </li>
          <li>
            Bạn được cấp quyền sử dụng mã nguồn / tài liệu để phục vụ cho các dự án cá nhân hoặc dự
            án thương mại của khách hàng bạn.
          </li>
          <li>
            <strong>Nghiêm cấm:</strong> Bán lại (resell), phân phối lại công khai, chia sẻ mã nguồn
            gốc trên các diễn đàn mở hoặc tạo sản phẩm phái sinh cạnh tranh trực tiếp dưới dạng
            template.
          </li>
          <li>
            Mỗi giấy phép có giới hạn số lượt tải tối đa (mặc định 5 lượt). Hệ thống sẽ tự động chặn
            nếu phát hiện chia sẻ link tải cho người khác.
          </li>
        </ul>

        <h2>3. Chính sách hoàn tiền (Refund Policy)</h2>
        <p>
          Do tính chất đặc thù của <strong>sản phẩm số (digital goods)</strong> có thể tải xuống và
          sử dụng ngay lập tức sau khi thanh toán:
        </p>
        <ul>
          <li>
            Chúng tôi cam kết hoàn tiền 100% trong vòng <strong>7 ngày</strong> kể từ khi mua nếu
            sản phẩm gặp lỗi kỹ thuật nghiêm trọng không thể khắc phục hoặc không đúng với mô tả cam
            kết.
          </li>
          <li>
            Khi yêu cầu hoàn tiền được duyệt, License Key liên quan sẽ bị thu hồi tự động và bạn sẽ
            không còn quyền tải về hay nhận các bản cập nhật phiên bản mới.
          </li>
          <li>
            Để yêu cầu hoàn tiền, vui lòng gửi email về <code>{siteConfig.author.email}</code> kèm
            mã đơn hàng (DH-xxxxx) và lý do chi tiết.
          </li>
        </ul>

        <h2>4. Trách nhiệm và giới hạn pháp lý</h2>
        <p>
          Tất cả sản phẩm và tài liệu kỹ thuật được cung cấp theo nguyên tắc &ldquo;nguyên
          trạng&rdquo; (as-is). Chúng tôi không chịu trách nhiệm đối với bất kỳ thiệt hại trực tiếp
          hoặc gián tiếp nào phát sinh từ việc sử dụng cấu hình hay mã nguồn không đúng theo khuyến
          nghị trong môi trường production.
        </p>
      </article>
    </Container>
  );
}
