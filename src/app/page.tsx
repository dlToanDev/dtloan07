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
import { getAffiliatePath } from '@/lib/affiliate-token';
import { getPublicHeroBannerConfig } from '@/server/actions/settings';
import { HeroBannerCarousel } from '@/components/marketing/hero-banner-carousel';
import { getServerTranslator } from '@/lib/i18n/server';
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
  const affiliatePath = getAffiliatePath();
  const [posts, categories, heroBannerConfig, { t }] = await Promise.all([
    getPostMetas(),
    getAllCategories(),
    getPublicHeroBannerConfig(),
    getServerTranslator(),
  ]);

  let products: Awaited<ReturnType<typeof db.product.findMany>> = [];
  let affiliateDeals: Awaited<ReturnType<typeof db.affiliateItem.findMany>> = [];

  try {
    [products, affiliateDeals] = await Promise.all([
      db.product.findMany({
        where: { status: 'ACTIVE', type: 'DOWNLOAD' },
        take: 3,
        orderBy: { createdAt: 'desc' },
      }),
      db.affiliateItem.findMany({
        where: { active: true, featured: true, category: { not: 'TOOLCODE' } },
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
    <Container className="space-y-16 py-8 sm:space-y-20 sm:py-16">
      <JsonLd data={personJsonLd()} />

      {/* 1. HERO SECTION - BANNER QUẢNG CÁO TƯƠNG TÁC (CHUYỂN 3 ẢNH ĐỐI TÁC CÓ LINK) */}
      {heroBannerConfig?.enabled && heroBannerConfig.banners.some((b) => b.active) ? (
        <section aria-label="Banner quảng cáo chính" className="space-y-6">
          <HeroBannerCarousel config={heroBannerConfig} />

          {/* 3 Nút CTA Phễu & Nhãn trạng thái */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`${siteConfig.shopPath}?c=source-code`}
                className={buttonStyles({ size: 'md' })}
              >
                {t('home.cta_products', 'Xem sản phẩm số')} <ArrowRight className="ml-1.5 size-4" />
              </Link>
              <Link href="/blog" className={buttonStyles({ variant: 'outline', size: 'md' })}>
                <BookOpen className="mr-1.5 size-4" /> {t('home.cta_blog', 'Đọc bài viết')}
              </Link>
              <Link
                href={affiliatePath}
                className={buttonStyles({
                  variant: 'ghost',
                  size: 'md',
                  className: 'text-amber-600 hover:bg-amber-500/10 dark:text-amber-400',
                })}
              >
                <Tag className="mr-1.5 size-4" /> {t('home.cta_deals', 'Ưu đãi Hosting & Tools')}
              </Link>
            </div>

            <div className="text-muted-foreground bg-muted/40 border-border/60 hidden items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs sm:flex">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              <span>
                {t('home.hero_partner', 'Đối tác hạ tầng & công nghệ chính thức của')}{' '}
                {siteConfig.name}
              </span>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex max-w-3xl flex-col items-start gap-6">
          <div className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>
              {t(
                'home.hero_badge',
                'Kinh nghiệm DevOps thực chiến & Giải pháp máy chủ tự vận hành',
              )}
            </span>
          </div>

          <h1 className="text-foreground text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {siteConfig.name}
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed text-pretty sm:text-xl">
            {siteConfig.description} Tối ưu chi phí hạ tầng máy chủ, làm chủ Nginx, Docker và tận
            dụng các giải pháp template chuẩn hoá cho production.
          </p>

          {/* 3 Nút CTA Phễu */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`${siteConfig.shopPath}?c=source-code`}
              className={buttonStyles({ size: 'lg' })}
            >
              {t('home.cta_products', 'Xem sản phẩm số')} <ArrowRight className="ml-1.5 size-4" />
            </Link>
            <Link href="/blog" className={buttonStyles({ variant: 'outline', size: 'lg' })}>
              <BookOpen className="mr-1.5 size-4" /> {t('home.cta_blog', 'Đọc bài viết')}
            </Link>
            <Link
              href={affiliatePath}
              className={buttonStyles({
                variant: 'ghost',
                size: 'lg',
                className: 'text-amber-600 hover:bg-amber-500/10 dark:text-amber-400',
              })}
            >
              <Tag className="mr-1.5 size-4" /> {t('home.cta_deals', 'Ưu đãi Hosting & Tools')}
            </Link>
          </div>
        </section>
      )}

      {/* 2. GIÁ TRỊ CỐT LÕI (VALUE STRIP) */}
      <section aria-label="Giá trị cốt lõi" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-border bg-card rounded-xl border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary rounded-lg p-2">
              <Server className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {t('home.val_realworld_title', '100% Thực chiến')}
              </h3>
              <p className="text-muted-foreground text-xs">
                {t('home.val_realworld_desc', 'Kinh nghiệm vận hành VPS thực tế')}
              </p>
            </div>
          </div>
        </div>

        <div className="border-border bg-card rounded-xl border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Zap className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{t('home.val_cost_title', 'Tối ưu chi phí')}</h3>
              <p className="text-muted-foreground text-xs">
                {t('home.val_cost_desc', 'Hạ tầng tự vận hành, chi phí $0')}
              </p>
            </div>
          </div>
        </div>

        <div className="border-border bg-card rounded-xl border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {t('home.val_security_title', 'Bảo mật chuẩn A+')}
              </h3>
              <p className="text-muted-foreground text-xs">
                {t('home.val_security_desc', 'Hardening Nginx, SSL, Rate-limit')}
              </p>
            </div>
          </div>
        </div>

        <div className="border-border bg-card rounded-xl border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {t('home.val_deals_title', 'Mã giảm giá độc quyền')}
              </h3>
              <p className="text-muted-foreground text-xs">
                {t('home.val_deals_desc', 'Credit dùng thử VPS & Tools')}
              </p>
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
                {t('home.products_title', 'Sản phẩm số & Template giải pháp')}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {t(
                  'home.products_desc',
                  'Các bộ cấu hình và template kiểm chứng thực tế, sẵn sàng cho môi trường production.',
                )}
              </p>
            </div>
            <Link
              href={`${siteConfig.shopPath}?c=source-code`}
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              {t('home.products_view_all', 'Xem tất cả')} <ArrowRight className="size-3.5" />
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
                <Sparkles className="size-3.5" /> {t('home.deals_badge', 'Độc quyền & Tiết kiệm')}
              </div>
              <h2 id="affiliate-heading" className="text-2xl font-bold tracking-tight">
                {t('home.deals_title', 'Ưu đãi Hosting & Công cụ khuyên dùng')}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t(
                  'home.deals_desc',
                  'Danh sách các nhà cung cấp VPS, tên miền và công cụ dev được blog đàm phán ưu đãi tốt nhất.',
                )}
              </p>
            </div>
            <Link
              href={affiliatePath}
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              {t('home.deals_view_all', 'Xem tất cả ưu đãi')} <ArrowRight className="size-3.5" />
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
              {t('home.blog_title', 'Bài viết kỹ thuật chuyên sâu')}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t(
                'home.blog_desc',
                'Hướng dẫn từng bước về tối ưu Nginx, Docker, CI/CD và quản trị server Linux.',
              )}
            </p>
          </div>
          <Link
            href="/blog"
            className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            {t('home.blog_view_all', 'Xem tất cả bài viết')} <ArrowRight className="size-3.5" />
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
              {t('home.blog_featured', 'Bài viết tiêu biểu')}
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
            {t('home.blog_latest', 'Mới cập nhật')}
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
            {t('home.newsletter_title', 'Nhận tài liệu kỹ thuật & bài viết mới')}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {t(
              'home.newsletter_desc',
              'Kinh nghiệm thực chiến về Nginx, Docker, quản trị VPS và tối ưu chi phí máy chủ. Đăng ký ngay để nhận miễn phí bộ Checklist Nginx Hardening.',
            )}
          </p>
          <div className="mt-6">
            <NewsletterForm
              source="homepage-footer"
              leadTitle="Checklist Nginx Hardening"
              buttonText={t('home.newsletter_btn', 'Nhận tài liệu miễn phí')}
            />
          </div>
        </div>
      </section>
    </Container>
  );
}
