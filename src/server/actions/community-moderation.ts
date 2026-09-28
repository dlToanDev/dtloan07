'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendUserWarningEmail } from '@/lib/mail';
import { shouldLockAfterWarnings, WARNING_LIMIT } from '@/lib/community/rules';

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') throw new Error('Bạn không có quyền kiểm duyệt.');
  return session.user.id ?? null;
}

const reasonSchema = z
  .string()
  .trim()
  .min(5, 'Nhập lý do (ít nhất 5 ký tự) để gửi cho người viết.')
  .max(500, 'Lý do tối đa 500 ký tự.');

function revalidateModeration(slug?: string) {
  for (const route of [
    '/',
    '/blog',
    '/categories/cong-dong',
    '/sitemap.xml',
    '/rss.xml',
    '/admin/community',
  ])
    revalidatePath(route);
  revalidatePath('/blog/page/[page]', 'page');
  revalidatePath('/tags/[tag]', 'page');
  if (slug) revalidatePath(`/blog/${slug}`);
}

/**
 * Gỡ bài và (tùy chọn) cảnh báo tác giả. Đủ WARNING_LIMIT cảnh báo thì khóa tài khoản.
 * Người viết nhận email kèm lý do.
 */
export async function removePostWithWarning(input: {
  postId: string;
  reason: string;
  warn: boolean;
}): Promise<Result<{ warningCount: number; locked: boolean }>> {
  const adminId = await requireAdmin();
  const reason = reasonSchema.safeParse(input.reason);
  if (!reason.success) return { ok: false, error: reason.error.errors[0]!.message };

  const post = await db.communityPost.findUnique({
    where: { id: input.postId },
    include: { author: { select: { id: true, email: true, role: true, lockedAt: true } } },
  });
  if (!post) return { ok: false, error: 'Không tìm thấy bài viết.' };
  if (post.status === 'REMOVED') return { ok: false, error: 'Bài đã bị gỡ trước đó.' };
  const warn = input.warn && post.author.role !== 'ADMIN';

  const { warningCount, locked } = await db.$transaction(async (tx) => {
    await tx.communityPost.update({
      where: { id: post.id },
      data: { status: 'REMOVED', removedAt: new Date(), removedReason: reason.data },
    });
    if (!warn) return { warningCount: 0, locked: false };
    await tx.userWarning.create({
      data: { userId: post.author.id, postId: post.id, reason: reason.data, issuedById: adminId },
    });
    const count = await tx.userWarning.count({ where: { userId: post.author.id } });
    const lock = shouldLockAfterWarnings(count) && !post.author.lockedAt;
    if (lock)
      await tx.user.update({
        where: { id: post.author.id },
        data: {
          lockedAt: new Date(),
          lockReason: `Đủ ${count} cảnh báo. Gần nhất: ${reason.data}`,
        },
      });
    return { warningCount: count, locked: lock || Boolean(post.author.lockedAt) };
  });

  await sendUserWarningEmail({
    to: post.author.email,
    reason: reason.data,
    postTitle: post.title,
    warningCount,
    limit: WARNING_LIMIT,
    locked,
  }).catch((error) => console.error('Lỗi gửi email cảnh báo:', error));

  revalidateModeration(post.slug);
  return { ok: true, data: { warningCount, locked } };
}

/** Khôi phục bài bị gỡ nhầm. Cảnh báo đã gửi giữ nguyên (xóa ở phần tài khoản nếu cần). */
export async function restoreCommunityPost(postId: string): Promise<Result> {
  await requireAdmin();
  const post = await db.communityPost.update({
    where: { id: postId },
    data: { status: 'PUBLISHED', removedAt: null, removedReason: null },
  });
  revalidateModeration(post.slug);
  return { ok: true, data: undefined };
}

/** Bật/tắt cho Google index bài cộng đồng (mặc định noindex). */
export async function setCommunityPostIndexable(
  postId: string,
  indexable: boolean,
): Promise<Result> {
  await requireAdmin();
  const post = await db.communityPost.update({ where: { id: postId }, data: { indexable } });
  revalidateModeration(post.slug);
  return { ok: true, data: undefined };
}

/** Mở khóa tài khoản; `clearWarnings` xóa luôn các cảnh báo để tính lại từ đầu. */
export async function unlockUser(userId: string, clearWarnings: boolean): Promise<Result> {
  await requireAdmin();
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { lockedAt: null, lockReason: null } });
    if (clearWarnings) await tx.userWarning.deleteMany({ where: { userId } });
  });
  revalidateModeration();
  return { ok: true, data: undefined };
}
