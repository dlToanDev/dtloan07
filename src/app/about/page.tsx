import { Container } from '@/components/layout/container';
import { siteConfig } from '@/config/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description: `Thông tin về tác giả và hành trình phát triển ${siteConfig.name}.`,
};

export default function AboutPage() {
  return (
    <Container className="max-w-3xl py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold tracking-tight">Về tác giả & {siteConfig.name}</h1>

        <p className="lead text-muted-foreground text-lg">
          Blog cá nhân chuyên sâu về lập trình Backend, Linux Server, DevOps, Docker và các giải
          pháp kiến trúc hệ thống thực chiến cho lập trình viên.
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
          snippet và bộ template sản phẩm số đều được kiểm chứng và tối ưu hoá để bạn có thể áp dụng
          trực tiếp vào công việc hàng ngày mà không mất hàng giờ gỡ lỗi.
        </p>

        <h2>Tác giả</h2>
        <p>
          Xin chào, mình là <strong>{siteConfig.author.name}</strong>, một kỹ sư phần mềm đam mê tối
          ưu hoá hệ thống, hạ tầng đám mây và công nghệ Web hiện đại.
        </p>
        <p>
          Nếu bạn có bất kỳ câu hỏi, góp ý hay muốn kết nối trao đổi kỹ thuật, đừng ngần ngại gửi
          email về <a href={`mailto:${siteConfig.author.email}`}>{siteConfig.author.email}</a>.
        </p>
      </article>
    </Container>
  );
}
