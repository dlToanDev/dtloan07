import { siteConfig } from '@/config/site';
import { getCategoryLabel, getAllPosts, getPostBySlug } from '@/lib/mdx';
import { ImageResponse } from 'next/og';

export const alt = 'Ảnh xem trước bài viết';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function PostOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#0b0d12',
        padding: 72,
      }}
    >
      <div style={{ display: 'flex', color: '#60a5fa', fontSize: 26 }}>
        {post ? getCategoryLabel(post.category) : siteConfig.shortName}
      </div>

      <div
        style={{
          display: 'flex',
          color: '#f8fafc',
          fontSize: post && post.title.length > 60 ? 54 : 64,
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        {post?.title ?? siteConfig.name}
      </div>

      <div
        style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 26 }}
      >
        <span>{siteConfig.url.replace(/^https?:\/\//, '')}</span>
        <span>{post ? `${post.readingMinutes} phút đọc` : ''}</span>
      </div>
    </div>,
    size,
  );
}
