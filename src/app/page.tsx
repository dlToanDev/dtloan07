import { PostCard } from '@/components/blog/post-card';
import { ProductCard } from '@/components/shop/product-card';
import { AffiliateCard } from '@/components/affiliate/affiliate-card';
import { CourseCard } from '@/components/courses/course-card';
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
import { summarizeVariants } from '@/lib/shop/variants';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles, Tag, BookOpen, GraduationCap } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: `${siteConfig.name} - DevOps, Quản trị Server & Sản phẩm số`,
  description: siteConfig.description,
  pathname: '/',
});

export const revalidate = 60; // 60s ISR

import { unstable_cache } from 'next/cache';

async function fetchHomeProducts() {
  return db.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      variants: {
        include: { _count: { select: { accountStock: { where: { status: 'AVAILABLE' } } } } },
      },
    },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });
}

const getHomeFeaturedProductsCached = unstable_cache(
  fetchHomeProducts,
  ['home-featured-products-v3'],
  { revalidate: 60, tags: ['products', 'shop'] },
);

async function getHomeFeaturedProducts() {
  if (process.env.NODE_ENV === 'development') {
    return fetchHomeProducts();
  }
  return getHomeFeaturedProductsCached();
}

async function fetchHomeAffiliateDeals() {
  return db.affiliateItem.findMany({
    where: { active: true },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });
}

const getHomeFeaturedAffiliateDealsCached = unstable_cache(
  fetchHomeAffiliateDeals,
  ['home-featured-affiliate-deals-v4'],
  { revalidate: 120, tags: ['affiliates'] },
);

async function getHomeFeaturedAffiliateDeals() {
  if (process.env.NODE_ENV === 'development') {
    return fetchHomeAffiliateDeals();
  }
  return getHomeFeaturedAffiliateDealsCached();
}

async function fetchHomeCourses() {
  return db.course.findMany({
    where: { status: { in: ['ACTIVE', 'UPCOMING'] } },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });
}

const getHomeFeaturedCoursesCached = unstable_cache(
  fetchHomeCourses,
  ['home-featured-courses-v4'],
  { revalidate: 120, tags: ['courses'] },
);

async function getHomeFeaturedCourses() {
  if (process.env.NODE_ENV === 'development') {
    return fetchHomeCourses();
  }
  return getHomeFeaturedCoursesCached();
}

export default async function HomePage() {
  const affiliatePath = getAffiliatePath();
  const [posts, categories, heroBannerConfig, { t }] = await Promise.all([
    getPostMetas(),
    getAllCategories(),
    getPublicHeroBannerConfig(),
    getServerTranslator(),
  ]);

  const [productsResult, affiliateDealsResult, coursesResult] = await Promise.allSettled([
    getHomeFeaturedProducts(),
    getHomeFeaturedAffiliateDeals(),
    getHomeFeaturedCourses(),
  ]);

  if (productsResult.status === 'rejected') {
    console.error('LỖI FETCH PRODUCTS:', productsResult.reason);
  }
  if (affiliateDealsResult.status === 'rejected') {
    console.error('LỖI FETCH AFFILIATE:', affiliateDealsResult.reason);
  }
  if (coursesResult.status === 'rejected') {
    console.error('LỖI FETCH COURSES:', coursesResult.reason);
  }

  const products = productsResult.status === 'fulfilled' ? productsResult.value : [];
  const affiliateDeals =
    affiliateDealsResult.status === 'fulfilled' ? affiliateDealsResult.value : [];
  const courses = coursesResult.status === 'fulfilled' ? coursesResult.value : [];

  // 3 bài viết mới nhất
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
              <Link href={siteConfig.shopPath} className={buttonStyles({ size: 'md' })}>
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
                  className: 'text-warning hover:bg-warning/10',
                })}
              >
                <Tag className="mr-1.5 size-4" /> {t('home.cta_deals', 'Ưu đãi Hosting & Tools')}
              </Link>
            </div>

            <div className="text-muted-foreground bg-muted/40 border-border/60 hidden items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs sm:flex">
              <span className="bg-success size-2 animate-pulse rounded-full" />
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
            <Link href={siteConfig.shopPath} className={buttonStyles({ size: 'lg' })}>
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
                className: 'text-warning hover:bg-warning/10',
              })}
            >
              <Tag className="mr-1.5 size-4" /> {t('home.cta_deals', 'Ưu đãi Hosting & Tools')}
            </Link>
          </div>
        </section>
      )}

      {/* 2. KHỐI BÀI VIẾT MỚI NHẤT */}
      <section aria-labelledby="blog-heading" className="space-y-6">
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

        {/* Danh sách bài viết mới nhất */}
        <div className="flex flex-col gap-6">
          {latestPosts.map((post) => (
            <PostCard key={post.slug} post={post} headingLevel="h3" />
          ))}
        </div>
      </section>

      {/* 3. KHỐI KHÓA HỌC NỔI BẬT */}
      {courses.length > 0 && (
        <section aria-labelledby="courses-heading" className="space-y-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-primary mb-1 inline-flex items-center gap-1.5 text-xs font-semibold">
                <GraduationCap className="size-3.5" /> {t('home.courses_badge', 'Học & Thực hành')}
              </div>
              <h2 id="courses-heading" className="text-2xl font-bold tracking-tight">
                {t('home.courses_title', 'Khóa học lập trình')}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t(
                  'home.courses_desc',
                  'Các khóa học chuyên sâu về lập trình, DevOps và quản trị hệ thống.',
                )}
              </p>
            </div>
            <Link
              href="/courses"
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              {t('home.courses_view_all', 'Xem tất cả khóa học')}{' '}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      {/* 4. KHỐI SẢN PHẨM SỐ NỔI BẬT (SHOP) */}
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
              href={siteConfig.shopPath}
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              {t('home.products_view_all', 'Xem tất cả')} <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                shop={{
                  type: product.type,
                  condition: product.condition,
                  summary: summarizeVariants(
                    product.variants.map((variant) => ({
                      ...variant,
                      stock:
                        product.type === 'ACCOUNT' && product.deliveryMode === 'AUTO'
                          ? (variant._count?.accountStock ?? variant.stock)
                          : variant.stock,
                    })),
                  ),
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. KHỐI HOT DEALS & TOOLS KHUYÊN DÙNG (AFFILIATE) */}
      {affiliateDeals.length > 0 && (
        <section aria-labelledby="affiliate-heading" className="space-y-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-warning mb-1 inline-flex items-center gap-1.5 text-xs font-semibold">
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
