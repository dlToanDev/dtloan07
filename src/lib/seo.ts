import { siteConfig } from '@/config/site';
import type { PostMeta } from '@/types/post';
import type { Metadata } from 'next';

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, siteConfig.url).toString();
}

interface BuildMetadataInput {
  title: string;
  description: string;
  /** Đường dẫn tương đối, ví dụ `/blog/abc`. Dùng làm canonical. */
  pathname: string;
  ogImage?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  tags?: readonly string[];
  noIndex?: boolean;
}

/**
 * Một chỗ duy nhất sinh metadata. Canonical là bắt buộc: thiếu nó thì
 * /blog?page=2 và /blog bị Google coi là nội dung trùng lặp.
 */
export function buildMetadata({
  title,
  description,
  pathname,
  ogImage,
  type = 'website',
  publishedTime,
  modifiedTime,
  tags,
  noIndex = false,
}: BuildMetadataInput): Metadata {
  const url = absoluteUrl(pathname);
  const image = ogImage ?? absoluteUrl(`${pathname === '/' ? '' : pathname}/opengraph-image`);

  return {
    title,
    description,
    alternates: { canonical: url },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      ...(type === 'article'
        ? {
            publishedTime,
            modifiedTime: modifiedTime ?? publishedTime,
            authors: [siteConfig.author.name],
            tags: tags ? [...tags] : undefined,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

/** JSON-LD: nhúng qua <script type="application/ld+json">. */
export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteConfig.author.name,
    email: siteConfig.author.email,
    url: siteConfig.url,
  };
}

export function blogPostingJsonLd(post: PostMeta) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    inLanguage: 'vi-VN',
    keywords: post.tags.join(', '),
    wordCount: post.wordCount,
    image: [absoluteUrl(`/blog/${post.slug}/opengraph-image`)],
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/blog/${post.slug}`) },
    author: { '@type': 'Person', name: siteConfig.author.name, url: siteConfig.url },
    publisher: { '@type': 'Person', name: siteConfig.author.name, url: siteConfig.url },
  };
}

export function breadcrumbJsonLd(items: { name: string; pathname: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.pathname),
    })),
  };
}
