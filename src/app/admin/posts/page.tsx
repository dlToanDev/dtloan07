import { getAdminPostMetas, getCategoryLabel } from '@/lib/mdx';
import { db } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink, BookOpen, Eye, Calendar, Clock, FileText, Plus } from 'lucide-react';
import { PostPublishButton } from '@/components/admin/post-publish-button';

export const metadata: Metadata = {
  title: 'Quản lý Bài viết - Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminPostsPage() {
  const posts = await getAdminPostMetas();

  let postViews: Record<string, number> = {};
  try {
    const views = await db.postView.findMany();
    postViews = Object.fromEntries(views.map((v) => [v.slug, v.count]));
  } catch (e) {
    console.warn('Lỗi đọc post views:', e);
  }

  const totalViews = Object.values(postViews).reduce((acc, count) => acc + count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <BookOpen className="text-primary size-5" /> Quản lý Bài viết ({posts.length})
          </h2>
          <p className="text-muted-foreground text-sm">
            Nội dung bài viết được lưu trữ và tối ưu bằng MDX trong thư mục{' '}
            <code>content/posts/</code>.
          </p>
        </div>
        <Link href="/admin/posts/new" className={buttonStyles({ className: 'shrink-0' })}>
          <Plus className="size-4" /> Thêm bài viết
        </Link>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-card border-border rounded-xl border p-4 shadow-2xs">
          <span className="text-muted-foreground text-xs font-medium uppercase">
            Tổng số bài viết
          </span>
          <div className="mt-1 text-2xl font-bold">{posts.length} bài</div>
          <p className="text-muted-foreground mt-1 text-xs">Bao gồm bài nháp và đã xuất bản</p>
        </div>

        <div className="bg-card border-border rounded-xl border p-4 shadow-2xs">
          <span className="text-muted-foreground text-xs font-medium uppercase">
            Bài viết nổi bật (Featured)
          </span>
          <div className="mt-1 text-2xl font-bold text-amber-500">
            {posts.filter((p) => p.featured).length} bài
          </div>
          <p className="text-muted-foreground mt-1 text-xs">Hiển thị ở trang chủ</p>
        </div>

        <div className="bg-card border-border rounded-xl border p-4 shadow-2xs">
          <span className="text-muted-foreground text-xs font-medium uppercase">Tổng lượt đọc</span>
          <div className="text-primary mt-1 text-2xl font-bold">{totalViews} lượt</div>
          <p className="text-muted-foreground mt-1 text-xs">Đo lường qua PostView counter</p>
        </div>
      </div>

      {/* Bảng danh sách bài viết */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách bài viết</CardTitle>
          <CardDescription>
            Kiểm tra trạng thái hiển thị, số phút đọc và xem trước bài viết trên web.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                  <th className="px-3 py-3">Tiêu đề bài viết</th>
                  <th className="px-3 py-3">Chuyên mục</th>
                  <th className="px-3 py-3 text-center">Trạng thái</th>
                  <th className="px-3 py-3 text-center">Thời gian đọc</th>
                  <th className="px-3 py-3 text-center">Ngày đăng</th>
                  <th className="px-3 py-3 text-center">Lượt xem</th>
                  <th className="px-3 py-3 text-right">Xem trước</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {posts.map((post) => {
                  const views = postViews[post.slug] ?? 0;
                  return (
                    <tr key={post.slug} className="hover:bg-muted/40 transition">
                      <td className="max-w-md px-3 py-3">
                        <div className="text-foreground font-semibold">{post.title}</div>
                        <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                          <span className="font-mono text-[11px]">/blog/{post.slug}</span>
                          {post.featured && (
                            <span className="py-0.2 rounded border border-amber-500/30 bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              Nổi bật
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(post.category)}
                        </Badge>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <PostPublishButton slug={post.slug} initialDraft={post.draft} />
                      </td>

                      <td className="text-muted-foreground px-3 py-3 text-center text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" /> {post.readingMinutes} phút
                        </span>
                      </td>

                      <td className="text-muted-foreground px-3 py-3 text-center text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3" /> {post.publishedAt}
                        </span>
                      </td>

                      <td className="text-foreground px-3 py-3 text-center font-bold">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Eye className="text-primary size-3" /> {views}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="hover:bg-muted text-primary border-primary/20 hover:border-primary/40 inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-semibold transition"
                        >
                          {post.draft ? 'Xem thử' : 'Đọc'} <ExternalLink className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Hướng dẫn soạn thảo bài viết */}
      <div className="bg-muted/40 border-border text-muted-foreground space-y-2 rounded-xl border p-5 text-xs">
        <h4 className="text-foreground flex items-center gap-1.5 font-semibold">
          <FileText className="text-primary size-4" /> Hướng dẫn thêm hoặc sửa bài viết mới:
        </h4>
        <p>
          Dùng nút <strong>Thêm bài viết</strong> để soạn hoặc tải file lên. Bạn cũng có thể tạo
          file MDX từ terminal bằng lệnh:
        </p>
        <code className="bg-card border-border text-foreground block rounded border p-2.5 font-mono">
          pnpm new:post &quot;Tên bài viết mới&quot; --category server --tags nginx,vps
        </code>
      </div>
    </div>
  );
}
