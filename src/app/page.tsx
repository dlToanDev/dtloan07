import { PostCard } from '@/components/blog/post-card';
import { ProductCard } from '@/components/shop/product-card';
import { AffiliateCard } from '@/components/affiliate/affiliate-card';
import { JsonLd } from '@/components/json-ld';
import { Container } from '@/components/layout/container';
import { NewsletterForm } from '@/components/marketing/newsletter-form';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { siteConfig } from '@/config/site';
import { getAllCategories, getCategoryLabel, getPostMetas } from '@/lib/mdx';
import { buildMetadata, personJsonLd } from '@/lib/seo';
import { db } from '@/lib/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles, Server, ShieldCheck, Zap, Tag, BookOpen } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: `${siteConfig.name} - DevOps, Quản trị Server & Sản phẩm số`,
  description: siteConfig.description,
  pathname: '/',
});

export const revalidate = 60; // 60s ISR

export default async function HomePage() {
  const [posts, categories] = await Promise.all([getPostMetas(), getAllCategories()]);

  let products: Awaited<ReturnType<typeof db.product.findMany>> = [];
  let affiliateDeals: Awaited<ReturnType<typeof db.affiliateItem.findMany>> = [];

  try {
    [products, affiliateDeals] = await Promise.all([
      db.product.findMany({
        where: { status: 'ACTIVE' },
        take: 3,
        orderBy: { createdAt: 'desc' },
      }),
      db.affiliateItem.findMany({
        where: { active: true, featured: true },
        take: 3,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
  } catch (err) {
    console.warn('Cảnh báo: Không thể tải danh sách sản phẩm/affiliate từ DB lúc build:', err);
  }

  // Bài viết nổi bật: Sắp xếp theo điểm tương tác thực tế
  // Điểm = (lượt xem × 1) + (like × 2) + (comment × 3) + (share × 2)
  const featuredPosts = [...posts]
    .sort((a, b) => (b.featuredScore ?? 0) - (a.featuredScore ?? 0))
    .slice(0, 2);
  const latestPosts = posts.slice(0, 3);

  return (
    <Container className="space-y-20 py-12 sm:py-20">
      <JsonLd data={personJsonLd()} />

      {/* 1. HERO SECTION */}
      <section className="flex max-w-3xl flex-col items-start gap-6">
        <div className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold">
          <Sparkles className="size-3.5" />
          <span>Kinh nghiệm DevOps thực chiến & Giải pháp máy chủ tự vận hành</span>
        </div>

        <h1 className="text-foreground text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {siteConfig.name}
        </h1>

        <p className="text-muted-foreground text-lg leading-relaxed text-pretty sm:text-xl">
          {siteConfig.description} Tối ưu chi phí hạ tầng máy chủ, làm chủ Nginx, Docker và tận dụng
          các giải pháp template chuẩn hoá cho production.
        </p>

        {/* 3 Nút CTA Phễu */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href="/products" className={buttonStyles({ size: 'lg' })}>
            Xem sản phẩm số <ArrowRight className="ml-1.5 size-4" />
          </Link>
          <Link href="/blog" className={buttonStyles({ variant: 'outline', size: 'lg' })}>
            <BookOpen className="mr-1.5 size-4" /> Đọc bài viết
          </Link>
          <Link
            href="/affiliate"
            className={buttonStyles({
              variant: 'ghost',
              size: 'lg',
              className: 'text-amber-600 hover:bg-amber-500/10 dark:text-amber-400',
            })}
          >
            <Tag className="mr-1.5 size-4" /> Ưu đãi Hosting & Tools
          </Link>
        </div>
      </section>

      {/* 2. GIÁ TRỊ CỐT LÕI (VALUE STRIP) */}
      <section aria-label="Giá trị cốt lõi" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-border bg-card rounded-xl border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary rounded-lg p-2">
              <Server className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">100% Thực chiến</h3>
              <p className="text-muted-foreground text-xs">Kinh nghiệm vận hành VPS thực tế</p>
            </div>
          </div>
        </div>

        <div className="border-border bg-card rounded-xl border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Zap className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Tối ưu chi phí</h3>
              <p className="text-muted-foreground text-xs">Hạ tầng tự vận hành, chi phí $0</p>
            </div>
          </div>
        </div>

        <div className="border-border bg-card rounded-xl border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Bảo mật chuẩn A+</h3>
              <p className="text-muted-foreground text-xs">Hardening Nginx, SSL, Rate-limit</p>
            </div>
          </div>
        </div>

        <div className="border-border bg-card rounded-xl border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Mã giảm giá độc quyền</h3>
              <p className="text-muted-foreground text-xs">Credit dùng thử VPS & Tools</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KHỐI SẢN PHẨM SỐ NỔI BẬT */}
      {products.length > 0 && (
        <section aria-labelledby="products-heading" className="space-y-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 id="products-heading" className="text-2xl font-bold tracking-tight">
                Sản phẩm số & Template giải pháp
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Các bộ cấu hình và template kiểm chứng thực tế, sẵn sàng cho môi trường production.
              </p>
            </div>
            <Link
              href="/products"
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              Xem tất cả <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 4. KHỐI HOT DEALS & TOOLS KHUYÊN DÙNG (AFFILIATE TEASER) */}
      {affiliateDeals.length > 0 && (
        <section aria-labelledby="affiliate-heading" className="space-y-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Sparkles className="size-3.5" /> Độc quyền & Tiết kiệm
              </div>
              <h2 id="affiliate-heading" className="text-2xl font-bold tracking-tight">
                Ưu đãi Hosting & Công cụ khuyên dùng
              </h2>
              <p className="text-muted-foreground text-sm">
                Danh sách các nhà cung cấp VPS, tên miền và công cụ dev được blog đàm phán ưu đãi
                tốt nhất.
              </p>
            </div>
            <Link
              href="/affiliate"
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              Xem tất cả ưu đãi <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {affiliateDeals.map((deal) => (
              <AffiliateCard key={deal.id} deal={deal} />
            ))}
          </div>
        </section>
      )}

      {/* 5. KHỐI BÀI VIẾT NỔI BẬT & MỚI NHẤT */}
      <section aria-labelledby="blog-heading" className="space-y-8">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 id="blog-heading" className="text-2xl font-bold tracking-tight">
              Bài viết kỹ thuật chuyên sâu
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Hướng dẫn từng bước về tối ưu Nginx, Docker, CI/CD và quản trị server Linux.
            </p>
          </div>
          <Link
            href="/blog"
            className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            Xem tất cả bài viết <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Categories tags */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map(({ category, count }) => (
              <Link key={category} href={`/categories/${category}`}>
                <Badge variant="outline" className="hover:bg-muted py-1 transition-colors">
                  {getCategoryLabel(category)} ({count})
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
              Bài viết tiêu biểu
            </h3>
            <div className="flex flex-col gap-6">
              {featuredPosts.map((post) => (
                <PostCard key={post.slug} post={post} headingLevel="h3" />
              ))}
            </div>
          </div>
        )}

        {/* Latest Posts */}
        <div className="border-border space-y-4 border-t pt-4">
          <h3 className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
            Mới cập nhật
          </h3>
          <div className="flex flex-col gap-6">
            {latestPosts.map((post) => (
              <PostCard key={post.slug} post={post} headingLevel="h3" />
            ))}
          </div>
        </div>
      </section>

      {/* 6. LEAD MAGNET / NEWSLETTER */}
      <section
        aria-labelledby="newsletter-heading"
        className="border-border bg-card rounded-2xl border p-8 text-center shadow-sm sm:p-10"
      >
        <div className="mx-auto max-w-xl">
          <h2
            id="newsletter-heading"
            className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Nhận tài liệu kỹ thuật & bài viết mới
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Kinh nghiệm thực chiến về Nginx, Docker, quản trị VPS và tối ưu chi phí máy chủ. Đăng ký
            ngay để nhận miễn phí bộ <strong>Checklist Nginx Hardening</strong>.
          </p>
          <div className="mt-6">
            <NewsletterForm
              source="homepage-footer"
              leadTitle="Checklist Nginx Hardening"
              buttonText="Nhận tài liệu miễn phí"
            />
          </div>
        </div>
      </section>
    </Container>
  );
}
