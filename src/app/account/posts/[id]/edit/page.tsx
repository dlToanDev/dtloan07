import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isUserPro } from '@/lib/membership-db';
import { CommunityPostForm } from '@/components/community/community-post-form';

export const dynamic = 'force-dynamic';

export default async function EditCommunityPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  const isPro = await isUserPro(userId);
  const isAdmin = session?.user?.role === 'ADMIN';

  if (!isPro && !isAdmin) redirect('/pro');
  const post = await db.communityPost.findUnique({ where: { id } });
  if (!post || post.authorId !== userId || post.status !== 'PUBLISHED') notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/account/posts" className="text-muted-foreground text-sm hover:underline">
          ← Bài viết của tôi
        </Link>
        <h2 className="mt-1 text-xl font-bold">Sửa bài viết</h2>
      </div>
      <CommunityPostForm
        initial={{
          id: post.id,
          title: post.title,
          contentHtml: post.contentHtml,
          coverUrl: post.coverUrl,
          tags: post.tags,
        }}
      />
    </div>
  );
}
