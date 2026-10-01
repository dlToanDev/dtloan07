'use server';

import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isPro } from '@/lib/membership';
import { getPostBySlug } from '@/lib/mdx';
import { slugifyPostTitle } from '@/lib/utils';
import { COMMUNITY_IMAGE_PREFIX } from '@/lib/community/sanitize';
import {
  DAILY_POST_LIMIT,
  parseCommunityPostInput,
  type CommunityPostInput,
} from '@/lib/community/rules';

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const IMAGE_DIR = path.join(process.cwd(), 'public', COMMUNITY_IMAGE_PREFIX);
// Không nhận SVG: SVG chứa được script.
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Người đang đăng nhập, còn hạn Pro hoặc là Admin, và không bị khóa — đọc thẳng DB, không tin session. */
async function requireProAuthor() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Vui lòng đăng nhập.');
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, proUntil: true, lockedAt: true },
  });
  if (!user || user.lockedAt) throw new Error('Tài khoản đã bị khóa.');
  if (user.role !== 'ADMIN' && !isPro(user)) {
    throw new Error('Chỉ tài khoản VIP/Pro hoặc Quản trị viên mới được đăng / sửa bài.');
  }
  return user;
}

function revalidateCommunity(slug?: string) {
  revalidateTag('community-posts');
  for (const route of [
    '/',
    '/blog',
    '/categories/cong-dong',
    '/sitemap.xml',
    '/rss.xml',
    '/account/posts',
  ])
    revalidatePath(route);
  revalidatePath('/blog/page/[page]', 'page');
  revalidatePath('/tags/[tag]', 'page');
  if (slug) revalidatePath(`/blog/${slug}`);
}

/** Slug chưa có bài nào dùng (kể cả bài MDX của admin): tên bài + 4 ký tự ngẫu nhiên. */
async function uniqueSlug(title: string) {
  const base = slugifyPostTitle(title).slice(0, 80) || 'bai-viet';
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${base}-${randomUUID().slice(0, 4)}`;
    const taken =
      (await db.communityPost.findUnique({ where: { slug }, select: { id: true } })) ||
      (await getPostBySlug(slug));
    if (!taken) return slug;
  }
  throw new Error('Không tạo được đường dẫn bài viết, vui lòng thử lại.');
}

export async function createCommunityPost(
  input: CommunityPostInput,
): Promise<Result<{ id: string; slug: string }>> {
  const user = await requireProAuthor();
  const parsed = parseCommunityPostInput(input);
  if (!parsed.ok) return parsed;

  const recent = await db.communityPost.count({
    where: { authorId: user.id, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (recent >= DAILY_POST_LIMIT)
    return { ok: false, error: `Mỗi ngày đăng tối đa ${DAILY_POST_LIMIT} bài. Hãy quay lại sau.` };

  const post = await db.communityPost.create({
    data: { ...parsed.data, slug: await uniqueSlug(parsed.data.title), authorId: user.id },
  });
  revalidateCommunity(post.slug);
  return { ok: true, data: { id: post.id, slug: post.slug } };
}

export async function updateCommunityPost(
  id: string,
  input: CommunityPostInput,
): Promise<Result<{ slug: string }>> {
  const user = await requireProAuthor();
  const post = await db.communityPost.findUnique({ where: { id } });
  if (!post || post.authorId !== user.id) return { ok: false, error: 'Không tìm thấy bài viết.' };
  if (post.status === 'REMOVED')
    return { ok: false, error: 'Bài đã bị admin gỡ nên không sửa được.' };
  const parsed = parseCommunityPostInput(input);
  if (!parsed.ok) return parsed;

  await db.communityPost.update({ where: { id }, data: parsed.data });
  revalidateCommunity(post.slug);
  return { ok: true, data: { slug: post.slug } };
}

/** Tác giả tự xóa bài của mình (không cần còn Pro). Bài đã bị gỡ giữ lại làm bằng chứng cảnh báo. */
export async function deleteOwnCommunityPost(id: string): Promise<Result> {
  const session = await auth();
  const post = await db.communityPost.findUnique({ where: { id } });
  if (!post || !session?.user?.id || post.authorId !== session.user.id)
    return { ok: false, error: 'Không tìm thấy bài viết.' };
  if (post.status === 'REMOVED') return { ok: false, error: 'Bài đã bị admin gỡ.' };
  await db.communityPost.delete({ where: { id } });
  revalidateCommunity(post.slug);
  return { ok: true, data: undefined };
}

export async function uploadCommunityImage(formData: FormData): Promise<Result<{ url: string }>> {
  try {
    await requireProAuthor();
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Chọn một ảnh.' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'Ảnh tối đa 5 MB.' };
  const ext = path.extname(file.name).toLowerCase();
  if (!IMAGE_EXTS.has(ext))
    return { ok: false, error: 'Chỉ nhận ảnh PNG, JPG, WebP, GIF hoặc AVIF.' };

  const fileName = `${randomUUID()}${ext}`;
  await mkdir(IMAGE_DIR, { recursive: true });
  await writeFile(path.join(IMAGE_DIR, fileName), Buffer.from(await file.arrayBuffer()));
  return { ok: true, data: { url: `${COMMUNITY_IMAGE_PREFIX}${fileName}` } };
}
