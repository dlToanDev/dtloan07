/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test tích hợp bài cộng đồng trên PostgreSQL thật: Pro đăng bài, admin gỡ + cảnh báo, 3 cảnh báo khóa.
 * Chạy bằng `pnpm test:int` sau `pnpm prisma migrate deploy`.
 */
import { describe, it, expect, vi } from 'vitest';

const session = { current: null as null | { user: { id: string; role: string } } };
vi.mock('@/lib/auth', () => ({ auth: async () => session.current }));
vi.mock('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn: any) => fn,
}));
vi.mock('@/lib/mail', () => ({ sendUserWarningEmail: async () => ({ success: true }) }));

const { db } = await import('@/lib/db');
const posts = await import('@/server/actions/community-post');
const moderation = await import('@/server/actions/community-moderation');
const { loadCommunityPosts } = await import('@/lib/community/posts');

const AUTHOR = {
  id: 'it-community-author',
  email: 'it-community-author@example.com',
  name: 'Tác giả IT',
};
const BASIC = { id: 'it-community-basic', email: 'it-community-basic@example.com' };
const ADMIN = {
  id: 'it-community-admin',
  email: 'it-community-admin@example.com',
  role: 'ADMIN' as const,
};

const asAuthor = () => (session.current = { user: { id: AUTHOR.id, role: 'USER' } });
const asAdmin = () => (session.current = { user: { id: ADMIN.id, role: 'ADMIN' } });
const body = `<p>${'Đây là nội dung bài viết thử nghiệm đủ dài. '.repeat(4)}</p>`;

async function cleanup() {
  await db.user.deleteMany({ where: { id: { in: [AUTHOR.id, BASIC.id, ADMIN.id] } } });
}

async function publish(title: string) {
  asAuthor();
  const result = await posts.createCommunityPost({ title, contentHtml: body, tags: ['IT Test'] });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

beforeAll(async () => {
  await cleanup();
  await db.user.createMany({
    data: [{ ...AUTHOR, proUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, BASIC, ADMIN],
  });
}, 60_000);

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
}, 60_000);

describe('đăng bài', () => {
  it('Pro đăng được, HTML bị lọc, bài hiện trong blog (noindex) kèm tên tác giả', async () => {
    asAuthor();
    const result = await posts.createCommunityPost({
      title: 'Bài IT đầu tiên',
      contentHtml: `${body}<img src="x" onerror="alert(1)"><script>alert(1)</script>`,
      tags: ['Docker', 'Docker'],
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.data.slug).toMatch(/^bai-it-dau-tien-[a-f0-9]{4}$/);

    const saved = await db.communityPost.findUniqueOrThrow({ where: { id: result.data.id } });
    expect(saved.contentHtml).not.toMatch(/script|onerror/);
    expect(saved.tags).toEqual(['docker']);

    const listed = (await loadCommunityPosts()).find((post) => post.slug === result.data.slug);
    expect(listed).toMatchObject({
      source: 'community',
      noIndex: true,
      author: { name: 'Tác giả IT', pro: true },
    });
  });

  it('tài khoản thường và khách không đăng được', async () => {
    session.current = { user: { id: BASIC.id, role: 'USER' } };
    await expect(
      posts.createCommunityPost({ title: 'Không được', contentHtml: body, tags: [] }),
    ).rejects.toThrow('Pro');
    session.current = null;
    await expect(
      posts.createCommunityPost({ title: 'Không được', contentHtml: body, tags: [] }),
    ).rejects.toThrow('đăng nhập');
  });

  it('người khác không sửa / xóa được bài', async () => {
    const { id } = await publish('Bài IT của tác giả');
    session.current = { user: { id: BASIC.id, role: 'USER' } };
    expect(await posts.deleteOwnCommunityPost(id)).toMatchObject({ ok: false });
  });
});

describe('kiểm duyệt', () => {
  it('gỡ + cảnh báo; đủ 3 cảnh báo thì khóa và ẩn bài của tác giả; mở khóa xóa cảnh báo', async () => {
    const created = [];
    for (let i = 1; i <= 3; i++) created.push(await publish(`Bài IT vi phạm ${i}`));

    asAdmin();
    for (const [index, post] of created.entries()) {
      const result = await moderation.removePostWithWarning({
        postId: post.id,
        reason: 'Spam link quảng cáo',
        warn: true,
      });
      if (!result.ok) throw new Error(result.error);
      expect(result.data).toEqual({ warningCount: index + 1, locked: index === 2 });
    }

    const author = await db.user.findUniqueOrThrow({ where: { id: AUTHOR.id } });
    expect(author.lockedAt).not.toBeNull();
    // Bài còn lại của tác giả bị khóa cũng không hiện nữa.
    expect((await loadCommunityPosts()).some((post) => post.author?.name === 'Tác giả IT')).toBe(
      false,
    );
    // Tài khoản bị khóa không đăng được.
    asAuthor();
    await expect(
      posts.createCommunityPost({ title: 'Sau khi khóa', contentHtml: body, tags: [] }),
    ).rejects.toThrow('khóa');

    asAdmin();
    expect(await moderation.unlockUser(AUTHOR.id, true)).toEqual({ ok: true, data: undefined });
    expect(await db.userWarning.count({ where: { userId: AUTHOR.id } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: AUTHOR.id } })).lockedAt).toBeNull();
  });

  it('mỗi ngày tối đa 5 bài mới', async () => {
    // Đã tạo 5 bài trong ngày ở các test trên.
    asAuthor();
    expect(
      await posts.createCommunityPost({ title: 'Bài IT thứ sáu', contentHtml: body, tags: [] }),
    ).toMatchObject({ ok: false, error: expect.stringContaining('tối đa 5') });
    // Lùi ngày tạo để test sau đăng tiếp được.
    await db.communityPost.updateMany({
      where: { authorId: AUTHOR.id },
      data: { createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    });
  });

  it('gỡ không tính cảnh báo, khôi phục, bật index; người thường không gọi được', async () => {
    const { id } = await publish('Bài IT gỡ nhầm');
    asAdmin();
    const removed = await moderation.removePostWithWarning({
      postId: id,
      reason: 'Gỡ thử nghiệm',
      warn: false,
    });
    expect(removed).toEqual({ ok: true, data: { warningCount: 0, locked: false } });
    expect(await db.userWarning.count({ where: { userId: AUTHOR.id } })).toBe(0);

    await moderation.restoreCommunityPost(id);
    await moderation.setCommunityPostIndexable(id, true);
    const post = await db.communityPost.findUniqueOrThrow({ where: { id } });
    expect(post).toMatchObject({ status: 'PUBLISHED', indexable: true, removedReason: null });

    asAuthor();
    await expect(moderation.setCommunityPostIndexable(id, false)).rejects.toThrow('quyền');
  });
});
