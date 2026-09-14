import { Container } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { siteConfig } from '@/config/site';
import Link from 'next/link';

const highlights = [
  {
    title: 'Quản trị server',
    description: 'Nginx, systemd, tuning Linux, giám sát và xử lý sự cố thực tế trên VPS.',
  },
  {
    title: 'Lập trình',
    description:
      'Next.js, TypeScript, PostgreSQL — ghi lại cách giải quyết vấn đề, kèm code chạy được.',
  },
  {
    title: 'Sản phẩm số',
    description:
      'Script, template và source code đóng gói sẵn để bạn dùng ngay cho dự án của mình.',
  },
];

export default function HomePage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="flex max-w-2xl flex-col items-start gap-5">
        <Badge variant="outline">Đang xây dựng — Phase 1</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="text-muted-foreground text-lg text-pretty">{siteConfig.description}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/blog" className={buttonStyles({ size: 'lg' })}>
            Đọc bài viết
          </Link>
          <Link href="/products" className={buttonStyles({ variant: 'outline', size: 'lg' })}>
            Xem sản phẩm
          </Link>
        </div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle as="h2">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground font-mono text-xs">
                $ nội dung sẽ có ở Phase 2–3
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}
