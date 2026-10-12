'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAuditEvent } from '@/lib/security/audit';

type Result = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN' || !session.user.id) {
    throw new Error('Bạn không có quyền quản lý người dùng.');
  }
  return session.user;
}

const lockSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(5, 'Lý do khóa phải có ít nhất 5 ký tự.').max(300),
});

function refreshPages() {
  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath('/admin/community');
}

export async function lockManagedUser(input: { userId: string; reason: string }): Promise<Result> {
  const admin = await requireAdmin();
  const parsed = lockSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' };
  if (parsed.data.userId === admin.id)
    return { ok: false, error: 'Không thể tự khóa tài khoản quản trị đang đăng nhập.' };

  const target = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, role: true, lockedAt: true },
  });
  if (!target) return { ok: false, error: 'Không tìm thấy tài khoản.' };
  if (target.role === 'ADMIN')
    return { ok: false, error: 'Không thể khóa tài khoản ADMIN tại màn hình này.' };
  if (target.lockedAt) return { ok: false, error: 'Tài khoản đã bị khóa trước đó.' };

  await db.$transaction([
    db.user.update({
      where: { id: target.id },
      data: { lockedAt: new Date(), lockReason: parsed.data.reason },
    }),
    db.session.deleteMany({ where: { userId: target.id } }),
  ]);

  await logAuditEvent({
    action: 'USER_LOCKED',
    actorId: admin.id,
    actorEmail: admin.email,
    details: { targetUserId: target.id, targetEmail: target.email, reason: parsed.data.reason },
  });
  refreshPages();
  return { ok: true };
}

export async function unlockManagedUser(userId: string, clearWarnings: boolean): Promise<Result> {
  const admin = await requireAdmin();
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!target) return { ok: false, error: 'Không tìm thấy tài khoản.' };
  if (target.role === 'ADMIN')
    return { ok: false, error: 'Không thay đổi trạng thái ADMIN tại màn hình này.' };

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { lockedAt: null, lockReason: null } });
    if (clearWarnings) await tx.userWarning.deleteMany({ where: { userId: target.id } });
  });

  await logAuditEvent({
    action: 'USER_UNLOCKED',
    actorId: admin.id,
    actorEmail: admin.email,
    details: { targetUserId: target.id, targetEmail: target.email, clearWarnings },
  });
  refreshPages();
  return { ok: true };
}
