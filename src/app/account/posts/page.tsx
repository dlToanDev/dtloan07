import Link from 'next/link';
import { PenLine } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isPro } from '@/lib/membership';
import { WARNING_LIMIT } from '@/lib/community/rules';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { DeleteOwnPostButton } from '@/components/community/delete-own-post-button';

export const dynamic = 'force-dynamic';

export default async function MyPostsPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const [user, posts, warnings] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { proUntil: true, role: true } }),
    db.communityPost.findMany({ where: { authorId: userId }, orderBy: { createdAt: 'desc' } }),
    db.userWarning.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ]);
  const pro = isPro(user);
  const canPost = pro || user?.role === 'ADMIN' || session?.user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/account" className="text-muted-foreground text-sm hover:underline">
            ← Tài khoản
          </Link>
          <h2 className="mt-1 text-xl font-bold">Bài viết của tôi ({posts.length})</h2>
        </div>
        {canPost ? (
          <Link href="/account/posts/new" className={buttonStyles({})}>
            <PenLine className="mr-1.5 size-4" /> Viết bài mới
          </Link>
        ) : (
          <Link href="/pro" className={buttonStyles({ variant: 'outline' })}>
            Nâng cấp Pro để đăng bài
          </Link>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
          <p className="font-semibold text-red-600">
            Bạn đã nhận {warnings.length}/{WARNING_LIMIT} cảnh báo. Đủ {WARNING_LIMIT} cảnh báo tài
            khoản sẽ bị khóa.
          </p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5">
            {warnings.map((warning) => (
              <li key={warning.id}>
                {warning.createdAt.toLocaleDateString('vi-VN')}: {warning.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Bạn chưa đăng bài nào.
        </p>
      ) : (
        <ul className="border-border divide-border divide-y rounded-xl border">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                {post.status === 'PUBLISHED' ? (
                  <Link href={`/blog/${post.slug}`} className="font-semibold hover:underline">
                    {post.title}
                  </Link>
                ) : (
                  <span className="text-muted-foreground font-semibold line-through">
                    {post.title}
                  </span>
                )}
                <div className="text-muted-foreground text-xs">
                  {post.createdAt.toLocaleDateString('vi-VN')}
                  {post.status === 'REMOVED' && post.removedReason
                    ? ` · Bị gỡ: ${post.removedReason}`
                    : ''}
                </div>
              </div>
              <Badge
                variant={post.status === 'PUBLISHED' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {post.status === 'PUBLISHED' ? 'Đang hiển thị' : 'Đã bị gỡ'}
              </Badge>
              {post.status === 'PUBLISHED' && (
                <>
                  {pro && (
                    <Link
                      href={`/account/posts/${post.id}/edit`}
                      className={buttonStyles({
                        size: 'sm',
                        variant: 'outline',
                        className: 'text-xs',
                      })}
                    >
                      Sửa
                    </Link>
                  )}
                  <DeleteOwnPostButton id={post.id} title={post.title} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
