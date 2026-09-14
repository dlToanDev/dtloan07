import { Pagination } from '@/components/blog/pagination';
import { PostCard } from '@/components/blog/post-card';
import { POSTS_PER_PAGE } from '@/config/blog';
import type { PostMeta } from '@/types/post';

export function paginate<T>(items: T[], page: number, perPage = POSTS_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);

  return {
    items: items.slice((current - 1) * perPage, current * perPage),
    current,
    totalPages,
  };
}

export function PostList({
  posts,
  page,
  totalPages,
}: {
  posts: PostMeta[];
  page?: number;
  totalPages?: number;
}) {
  if (posts.length === 0) {
    return <p className="text-muted-foreground mt-8">Chưa có bài viết nào.</p>;
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-8">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
      {page && totalPages ? <Pagination current={page} total={totalPages} /> : null}
    </>
  );
}
