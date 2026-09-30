import { Container } from '@/components/layout/container';
import { siteConfig } from '@/config/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giới thiệu & Liên hệ',
  description: `Thông tin về tác giả Hoàng Anh Toàn và blog ${siteConfig.name}.`,
};

export default function AboutPage() {
  return (
    <Container className="max-w-3xl py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold tracking-tight">Về tác giả & {siteConfig.name}</h1>

        <p className="lead text-muted-foreground text-lg">
          Xin chào, mình là <strong>{siteConfig.author.name}</strong>, hiện đang sinh sống và làm
          việc tại <strong>Hà Nội</strong>. Blog cá nhân chuyên sâu về lập trình Backend, Linux
          Server, DevOps, Docker và các giải pháp kiến trúc hệ thống thực chiến cho lập trình viên.
        </p>

        <h2>Sứ mệnh của blog</h2>
        <p>
          Trong quá trình làm việc và triển khai hệ thống cho các dự án thực tế, việc tối ưu hiệu
          năng, cấu hình Reverse Proxy, bảo mật máy chủ và đóng gói container luôn có rất nhiều cạm
          bẫy tiềm ẩn.
        </p>
        <p>
          {siteConfig.name} được xây dựng với phương châm:{' '}
          <strong>Thực chiến - Ngắn gọn - Chuẩn Production</strong>. Tất cả các bài viết, code
          snippet, khóa học và bộ template sản phẩm số đều được kiểm chứng và tối ưu hoá để bạn có
          thể áp dụng trực tiếp vào công việc hàng ngày mà không mất hàng giờ gỡ lỗi.
        </p>

        <h2 id="lien-he">Tác giả & Thông tin liên hệ</h2>
        <ul>
          <li>
            <strong>Họ tên tác giả:</strong> {siteConfig.author.name}
          </li>
          <li>
            <strong>Địa chỉ:</strong> {siteConfig.author.address}
          </li>
          <li>
            <strong>Hotline / Zalo:</strong>{' '}
            <a href={`tel:${siteConfig.author.phone}`}>{siteConfig.author.phone}</a>
          </li>
          <li>
            <strong>Email liên hệ:</strong>{' '}
            <a href={`mailto:${siteConfig.author.email}`}>{siteConfig.author.email}</a>
          </li>
          <li>
            <strong>Facebook Fanpage:</strong>{' '}
            <a href={siteConfig.links.facebook} target="_blank" rel="noopener noreferrer">
              dltoan07
            </a>
          </li>
          <li>
            <strong>Kênh YouTube:</strong>{' '}
            <a href={siteConfig.links.youtube} target="_blank" rel="noopener noreferrer">
              dltoan07
            </a>
          </li>
          <li>
            <strong>TikTok:</strong>{' '}
            <a href={siteConfig.links.tiktok} target="_blank" rel="noopener noreferrer">
              @dltoan07
            </a>
          </li>
          <li>
            <strong>Telegram:</strong>{' '}
            <a href={siteConfig.links.telegram} target="_blank" rel="noopener noreferrer">
              @dltoan07Blog
            </a>
          </li>
          <li>
            <strong>GitHub:</strong>{' '}
            <a href={siteConfig.links.github} target="_blank" rel="noopener noreferrer">
              dltoan07
            </a>
          </li>
        </ul>

        <h2>Cam kết chất lượng & Uy tín</h2>
        <ul>
          <li>
            <strong>Giao dịch an toàn & Ship nhanh:</strong> Cấp mã bản quyền, khóa học và tài khoản
            tự động 24/7. Hỗ trợ giao hàng vật lý siêu tốc.
          </li>
          <li>
            <strong>Đồ chất lượng:</strong> Sản phẩm số và tài liệu mã nguồn luôn được kiểm duyệt và
            bảo hành kỹ thuật tận tâm.
          </li>
          <li>
            <strong>Chia sẻ kiến thức:</strong> Luôn cập nhật những kiến thức, kỹ năng và kinh
            nghiệm thực chiến hữu ích nhất cho cộng đồng.
          </li>
        </ul>
      </article>
    </Container>
  );
}
