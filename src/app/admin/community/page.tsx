import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import {
  PostModerationActions,
  UnlockUserButton,
} from '@/components/admin/community/moderation-actions';

export const dynamic = 'force-dynamic';

export default async function AdminCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/');
  const { status } = await searchParams;
  const filter = status === 'removed' ? 'REMOVED' : 'PUBLISHED';

  const [posts, lockedUsers] = await Promise.all([
    db.communityPost.findMany({
      where: { status: filter },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        author: {
          select: {
            email: true,
            name: true,
            lockedAt: true,
            _count: { select: { warnings: true } },
          },
        },
      },
    }),
    db.user.findMany({
      where: { lockedAt: { not: null } },
      select: {
        id: true,
        email: true,
        name: true,
        lockedAt: true,
        lockReason: true,
        _count: { select: { warnings: true } },
      },
      orderBy: { lockedAt: 'desc' },
    }),
  ]);

  const tab = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium ${
      active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
    }`;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Bài cộng đồng</h1>
        <p className="text-muted-foreground text-sm">
          Bài tài khoản Pro đăng hiện ngay trên blog (mặc định không cho Google index). Gỡ bài vi
          phạm kèm cảnh báo; đủ 3 cảnh báo tài khoản tự bị khóa.
        </p>
        <nav className="flex gap-2 pt-2">
          <Link href="/admin/community" className={tab(filter === 'PUBLISHED')}>
            Đang hiển thị
          </Link>
          <Link href="/admin/community?status=removed" className={tab(filter === 'REMOVED')}>
            Đã gỡ
          </Link>
        </nav>
      </div>

      {posts.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Không có bài nào.
        </p>
      ) : (
        <ul className="border-border divide-border divide-y rounded-xl border">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-start gap-4 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1 space-y-1">
                <Link
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  className="font-semibold hover:underline"
                >
                  {post.title}
                </Link>
                <div className="text-muted-foreground text-xs">
                  {post.author.name || post.author.email} · {post.author.email} ·{' '}
                  {post.createdAt.toLocaleString('vi-VN')}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {post.indexable ? 'Được index' : 'noindex'}
                  </Badge>
                  {post.author._count.warnings > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {post.author._count.warnings}/3 cảnh báo
                    </Badge>
                  )}
                  {post.author.lockedAt && (
                    <Badge variant="destructive" className="text-[10px]">
                      Tác giả bị khóa
                    </Badge>
                  )}
                </div>
                {post.removedReason && (
                  <p className="text-xs text-red-600">Lý do gỡ: {post.removedReason}</p>
                )}
              </div>
              <PostModerationActions
                postId={post.id}
                status={post.status}
                indexable={post.indexable}
                authorWarnings={post.author._count.warnings}
              />
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Tài khoản bị khóa ({lockedUsers.length})</h2>
        {lockedUsers.length === 0 ? (
          <p className="text-muted-foreground text-sm">Không có tài khoản nào bị khóa.</p>
        ) : (
          <ul className="border-border divide-border divide-y rounded-xl border">
            {lockedUsers.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{user.name || user.email}</div>
                  <div className="text-muted-foreground text-xs">
                    {user.email} · khóa {user.lockedAt!.toLocaleDateString('vi-VN')} ·{' '}
                    {user._count.warnings} cảnh báo
                    {user.lockReason ? ` · ${user.lockReason}` : ''}
                  </div>
                </div>
                <UnlockUserButton userId={user.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
