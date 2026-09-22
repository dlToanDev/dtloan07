'use client';

import { Button, buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  CornerDownRight,
  Heart,
  Lock,
  LogIn,
  MessageSquare,
  Send,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export interface CommentItem {
  id: string;
  author: string;
  badge?: string;
  avatarBg: string;
  createdAt: string;
  content: string;
  likes: number;
  isLiked?: boolean;
  replies?: CommentItem[];
}

interface AuthUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

const DEFAULT_COMMENTS_MAP: Record<string, CommentItem[]> = {
  'toi-uu-nginx-reverse-proxy': [
    {
      id: 'c1',
      author: 'Hoàng Long',
      badge: 'DevOps Engineer',
      avatarBg: 'bg-emerald-600',
      createdAt: '3 ngày trước',
      content:
        'Bài viết rất chi tiết ạ! Cho mình hỏi thêm là nếu server có nhiều CPU core thì worker_processes nên để auto hay set cứng theo số core vậy tác giả?',
      likes: 12,
      replies: [
        {
          id: 'c1-r1',
          author: 'Toàn Nguyễn',
          badge: 'Tác giả',
          avatarBg: 'bg-primary',
          createdAt: '3 ngày trước',
          content:
            'Chào bạn Long, nên để `worker_processes auto;` nhé bạn. Nginx phiên bản mới tự động nhận diện chính xác số core vật lý và gán worker rất chuẩn.',
          likes: 8,
        },
      ],
    },
    {
      id: 'c2',
      author: 'Minh Tuấn',
      badge: 'Fullstack Dev',
      avatarBg: 'bg-blue-600',
      createdAt: '1 tuần trước',
      content:
        'Cấu hình proxy_cache_valid 365d cho static chunks của Next.js thật sự cứu cánh, traffic bên mình giảm tải hẳn cho Node container trên con VPS Hetzner 4GB RAM.',
      likes: 16,
    },
  ],
  'docker-compose-postgres-local': [
    {
      id: 'c3',
      author: 'Ngọc Hải',
      badge: 'Backend Dev',
      avatarBg: 'bg-indigo-600',
      createdAt: '4 ngày trước',
      content:
        'Cái healthcheck pg_isready quan trọng thật sự. Trước đây lúc chạy CI/CD toàn bị dính lỗi Prisma connect trước khi Postgres sẵn sàng, giờ thêm block healthcheck này là êm ru.',
      likes: 9,
    },
    {
      id: 'c4',
      author: 'Văn Đức',
      avatarBg: 'bg-amber-600',
      createdAt: '1 tuần trước',
      content:
        'Nếu muốn thêm extension pgvector cho bài toán AI embeddings thì image nên sửa như nào tác giả ơi?',
      likes: 5,
      replies: [
        {
          id: 'c4-r1',
          author: 'Toàn Nguyễn',
          badge: 'Tác giả',
          avatarBg: 'bg-primary',
          createdAt: '6 ngày trước',
          content:
            'Bạn chỉ cần đổi `image: pgvector/pgvector:pg16` là xong nhé, toàn bộ cú pháp volume và port trong compose giữ nguyên hoàn toàn!',
          likes: 7,
        },
      ],
    },
  ],
  'zod-validate-bien-moi-truong': [
    {
      id: 'c5',
      author: 'Trần Quân',
      badge: 'Frontend Lead',
      avatarBg: 'bg-purple-600',
      createdAt: '5 ngày trước',
      content:
        'Chuẩn luôn anh, trước em dính bug thiếu NEXT_PUBLIC_API_URL trên production mà build không báo gì, khách bấm thanh toán mới lòi ra undefined cay đắng.',
      likes: 21,
    },
    {
      id: 'c6',
      author: 'Lê Hữu Nam',
      avatarBg: 'bg-teal-600',
      createdAt: '1 tuần trước',
      content:
        'Zod quả thật là chân ái cho TypeScript project. Đoạn ép kiểu parse serverEnv lúc boot xong từ đó code tự tin hẳn không sợ typo tên biến.',
      likes: 14,
    },
  ],
  'redis-cache-layer-nextjs': [
    {
      id: 'c7',
      author: 'Đặng Khoa',
      badge: 'Solutions Architect',
      avatarBg: 'bg-rose-600',
      createdAt: 'Hôm qua',
      content:
        'Giải pháp chống Cache Stampede bằng distributed lock SET NX PX viết rất gãy gọn và dễ hiểu. Cảm ơn bài viết thực chiến của anh!',
      likes: 28,
    },
    {
      id: 'c8',
      author: 'Quang Huy',
      avatarBg: 'bg-sky-600',
      createdAt: '2 ngày trước',
      content:
        'Next.js 15 dùng fetch cache với Redis cache adapter này có xung đột gì với ISR không anh?',
      likes: 11,
      replies: [
        {
          id: 'c8-r1',
          author: 'Toàn Nguyễn',
          badge: 'Tác giả',
          avatarBg: 'bg-primary',
          createdAt: 'Hôm qua',
          content:
            'Không xung đột bạn nhé. ISR lưu trữ trang rendered HTML ở tầng Next.js server, còn Redis này ta dùng để cache dữ liệu thô (raw data/queries) ở tầng Service/Data Access.',
          likes: 9,
        },
      ],
    },
  ],
  'cicd-github-actions-docker-vps': [
    {
      id: 'c9',
      author: 'Bảo Anh',
      badge: 'DevOps',
      avatarBg: 'bg-emerald-600',
      createdAt: '2 ngày trước',
      content:
        'Dùng docker buildx với cache-to: type=gha giúp thời gian build image của mình giảm từ 5 phút xuống còn 40 giây. Bài viết cực kỳ giá trị!',
      likes: 18,
    },
  ],
  'giam-sat-vps-prometheus-grafana': [
    {
      id: 'c10',
      author: 'Thành Đạt',
      badge: 'Sysadmin',
      avatarBg: 'bg-orange-600',
      createdAt: '3 ngày trước',
      content:
        'Dashboard Grafana thiết kế rất đẹp và trực quan. Node exporter nhẹ thật sự, chạy trên con VPS 1GB RAM mà hầu như không cảm nhận thấy tốn tài nguyên.',
      likes: 15,
    },
  ],
};

export function PostComments({
  postSlug,
  initialCommentCount = 0,
}: {
  postSlug: string;
  initialCommentCount?: number;
}) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loginPromptReason, setLoginPromptReason] = useState<string | null>(null);

  // 1. Kiểm tra session đăng nhập từ Auth.js
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.user?.email) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  // 2. Khởi tạo comments từ localStorage hoặc template mặc định
  useEffect(() => {
    const storageKey = `blog_comments_${postSlug}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        setComments(JSON.parse(saved));
        return;
      } catch {
        // Fallback sang template
      }
    }

    const defaultComments = DEFAULT_COMMENTS_MAP[postSlug] ?? [
      {
        id: 'default-1',
        author: 'Nguyễn Văn A',
        avatarBg: 'bg-primary',
        createdAt: 'Vừa xong',
        content: 'Bài viết rất hữu ích và thực chiến, cảm ơn tác giả đã chia sẻ!',
        likes: 4,
      },
    ];
    setComments(defaultComments);
  }, [postSlug]);

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies ? c.replies.length : 0), 0);

  const handleLikeComment = (id: string) => {
    setComments((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const isLiked = !item.isLiked;
          return {
            ...item,
            isLiked,
            likes: isLiked ? item.likes + 1 : item.likes - 1,
          };
        }
        if (item.replies) {
          return {
            ...item,
            replies: item.replies.map((reply) => {
              if (reply.id === id) {
                const isLiked = !reply.isLiked;
                return {
                  ...reply,
                  isLiked,
                  likes: isLiked ? reply.likes + 1 : reply.likes - 1,
                };
              }
              return reply;
            }),
          };
        }
        return item;
      });

      localStorage.setItem(`blog_comments_${postSlug}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setLoginPromptReason('Bạn cần đăng nhập để gửi bình luận.');
      return;
    }

    if (!content.trim()) return;

    setSubmitting(true);

    const displayName =
      currentUser.name?.trim() || currentUser.email?.split('@')[0] || 'Thành viên';

    const newComment: CommentItem = {
      id: `c_${Date.now()}`,
      author: displayName,
      badge: currentUser.role === 'ADMIN' ? 'Tác giả' : 'Thành viên',
      avatarBg: currentUser.role === 'ADMIN' ? 'bg-primary' : 'bg-emerald-600',
      createdAt: 'Vừa xong',
      content: content.trim(),
      likes: 0,
    };

    setTimeout(() => {
      let updated: CommentItem[];

      if (replyingTo) {
        updated = comments.map((c) => {
          if (c.id === replyingTo) {
            return {
              ...c,
              replies: [...(c.replies ?? []), newComment],
            };
          }
          return c;
        });
      } else {
        updated = [newComment, ...comments];
      }

      setComments(updated);
      localStorage.setItem(`blog_comments_${postSlug}`, JSON.stringify(updated));

      setContent('');
      setReplyingTo(null);
      setSubmitting(false);
      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 4000);
    }, 400);
  };

  const startReply = (authorName: string, commentId: string) => {
    if (!currentUser) {
      setLoginPromptReason(`Bạn cần đăng nhập để trả lời bình luận của ${authorName}.`);
      // Scroll to login box
      const box = document.getElementById('comment-auth-gate');
      if (box) box.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setReplyingTo(commentId);
    setContent(`@${authorName} `);
    const textarea = document.getElementById('comment-textarea');
    if (textarea) {
      textarea.focus();
    }
  };

  return (
    <section aria-labelledby="comments-heading" className="border-border mt-16 border-t pt-10">
      {/* Tiêu đề mục bình luận */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2
            id="comments-heading"
            className="text-foreground flex items-center gap-2.5 text-2xl font-bold tracking-tight"
          >
            <MessageSquare className="text-primary size-6" />
            Bình luận ({totalCount || initialCommentCount})
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Đặt câu hỏi, chia sẻ ý kiến hoặc góp ý giải pháp kỹ thuật cùng cộng đồng.
          </p>
        </div>
      </div>

      {/* KHỐI BÌNH LUẬN: CHỈ TÀI KHOẢN ĐĂNG NHẬP MỚI BÌNH LUẬN ĐƯỢC */}
      {!checkingAuth && !currentUser ? (
        <div
          id="comment-auth-gate"
          className="bg-card border-border mb-10 rounded-xl border border-dashed p-6 text-center shadow-xs sm:p-8"
        >
          <div className="bg-primary/10 text-primary mx-auto mb-3 flex size-12 items-center justify-center rounded-full">
            <Lock className="size-6" />
          </div>

          <h3 className="text-foreground text-base font-bold">
            {loginPromptReason || 'Đăng nhập tài khoản để tham gia bình luận'}
          </h3>

          <p className="text-muted-foreground mx-auto mt-1.5 max-w-md text-xs leading-relaxed sm:text-sm">
            Chỉ những tài khoản đã đăng nhập mới có quyền đặt câu hỏi, chia sẻ kinh nghiệm hoặc nhận
            phản hồi trực tiếp từ tác giả.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
              className={buttonStyles({ size: 'sm', className: 'font-semibold' })}
            >
              <LogIn className="mr-1.5 size-4" /> Đăng nhập để bình luận
            </Link>

            <Link
              href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
              className={buttonStyles({ variant: 'outline', size: 'sm' })}
            >
              Đăng ký tài khoản
            </Link>
          </div>

          {/* Gợi ý đăng nhập tài khoản có sẵn trong dev */}
          <div className="border-border/60 text-muted-foreground mx-auto mt-5 max-w-md border-t pt-4 text-xs">
            <p>
              Tài khoản thử nghiệm:{' '}
              <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono">
                admin@hvpgroup.vn
              </code>{' '}
              (Mật khẩu:{' '}
              <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono">
                Admin@123456
              </code>
              )
            </p>
          </div>
        </div>
      ) : checkingAuth ? (
        <div className="bg-card border-border text-muted-foreground mb-10 rounded-xl border p-6 text-center text-xs">
          Đang kiểm tra trạng thái đăng nhập...
        </div>
      ) : (
        /* Form gửi bình luận cho người dùng ĐÃ ĐĂNG NHẬP */
        <form
          onSubmit={handleSubmit}
          className="bg-card border-border mb-10 space-y-4 rounded-xl border p-5 shadow-xs"
        >
          {/* Thông tin tài khoản đang đăng nhập */}
          <div className="border-border/60 flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-xs font-bold shadow-xs">
                {(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground text-xs font-bold">
                    {currentUser?.name || currentUser?.email}
                  </span>
                  <span className="py-0.2 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="size-2.5" /> Đã đăng nhập
                  </span>
                  {currentUser?.role === 'ADMIN' && (
                    <span className="text-primary bg-primary/10 py-0.2 border-primary/20 rounded-full border px-1.5 text-[10px] font-semibold">
                      Tác giả / Admin
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground font-mono text-[11px]">
                  {currentUser?.email}
                </div>
              </div>
            </div>

            {replyingTo && (
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(null);
                  setContent('');
                }}
                className="text-muted-foreground hover:text-foreground text-xs underline transition"
              >
                Hủy trả lời
              </button>
            )}
          </div>

          <div>
            <label
              htmlFor="comment-textarea"
              className="text-muted-foreground mb-1 block text-xs font-medium"
            >
              {replyingTo ? 'Nội dung phản hồi' : 'Nội dung bình luận của bạn'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="comment-textarea"
              required
              rows={3}
              placeholder="Chia sẻ góc nhìn, câu hỏi hoặc kinh nghiệm của bạn về bài viết này..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border-border bg-background text-foreground focus:ring-primary/40 min-h-[85px] w-full resize-y rounded-lg border p-3 text-sm focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground text-xs">
              Bình luận sẽ được đăng công khai dưới danh nghĩa tài khoản của bạn.
            </span>

            <Button
              type="submit"
              size="sm"
              loading={submitting}
              loadingText="Đang gửi..."
              disabled={!content.trim()}
            >
              <Send className="mr-1.5 size-3.5" /> Gửi bình luận
            </Button>
          </div>

          {justSubmitted && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              Bình luận của bạn đã được xuất bản thành công!
            </div>
          )}
        </form>
      )}

      {/* Danh sách các bình luận đã có */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-4">
            {/* Bình luận chính */}
            <div className="bg-card/60 border-border/80 hover:border-border rounded-xl border p-4 transition sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs',
                      comment.avatarBg,
                    )}
                  >
                    {comment.author.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-sm font-semibold">
                        {comment.author}
                      </span>
                      {comment.badge && (
                        <span
                          className={cn(
                            'py-0.2 rounded-full border px-2 text-[10px] font-semibold',
                            comment.badge === 'Tác giả'
                              ? 'bg-primary/10 border-primary/30 text-primary'
                              : 'bg-muted border-border text-muted-foreground',
                          )}
                        >
                          {comment.badge}
                        </span>
                      )}
                    </div>
                    <time className="text-muted-foreground text-[11px]">{comment.createdAt}</time>
                  </div>
                </div>

                {/* Nút Like & Trả lời */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLikeComment(comment.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
                      comment.isLiked
                        ? 'border-rose-500/30 bg-rose-500/10 font-semibold text-rose-500'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground border-transparent',
                    )}
                    title="Thích bình luận này"
                  >
                    <Heart className={cn('size-3.5', comment.isLiked && 'fill-rose-500')} />
                    <span>{comment.likes}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startReply(comment.author, comment.id)}
                    className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
                  >
                    <CornerDownRight className="size-3.5" />
                    <span>Trả lời</span>
                  </button>
                </div>
              </div>

              <div className="text-foreground/90 mt-3 pl-12 text-sm leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </div>
            </div>

            {/* Các phản hồi lồng (Replies) */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="space-y-3 pl-6 sm:pl-10">
                {comment.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="bg-muted/40 border-border/70 relative rounded-xl border p-3.5 sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-xs',
                            reply.avatarBg,
                          )}
                        >
                          {reply.author.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-foreground text-xs font-semibold">
                              {reply.author}
                            </span>
                            {reply.badge && (
                              <span
                                className={cn(
                                  'py-0.2 rounded-full border px-1.5 text-[9px] font-semibold',
                                  reply.badge === 'Tác giả'
                                    ? 'bg-primary/15 border-primary/30 text-primary'
                                    : 'bg-muted border-border text-muted-foreground',
                                )}
                              >
                                {reply.badge}
                              </span>
                            )}
                          </div>
                          <time className="text-muted-foreground text-[10px]">
                            {reply.createdAt}
                          </time>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLikeComment(reply.id)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors',
                          reply.isLiked
                            ? 'font-semibold text-rose-500'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Heart className={cn('size-3', reply.isLiked && 'fill-rose-500')} />
                        <span>{reply.likes}</span>
                      </button>
                    </div>

                    <div className="text-foreground/90 mt-2 pl-9 text-xs leading-relaxed">
                      {reply.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
