/**
 * Upload video / slide / tài liệu thẳng lên kho S3 (R2) theo từng phần.
 * Chạy khi có R2_ENDPOINT trỏ tới kho S3 local (vd. SeaweedFS / MinIO), ví dụ:
 *   R2_ENDPOINT=http://127.0.0.1:8333 R2_ACCESS_KEY_ID=k R2_SECRET_ACCESS_KEY=s R2_BUCKET=courses \
 *   pnpm test:int tests/integration/course-uploads.test.ts
 */
import { createHash } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'admin', role: 'ADMIN' } }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const enabled = Boolean(process.env.R2_ENDPOINT);
const { db } = await import('@/lib/db');
const storage = await import('@/lib/storage');
const actions = await import('@/server/actions/course-lessons');

const P = 'it-upload-';
let courseId = '';
let lessonId = '';
let otherLessonId = '';

const sha = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');

/** Làm đúng như trình duyệt: xin link, PUT từng phần, gửi ETag để ghép file. */
async function upload(
  kind: 'video' | 'slide' | 'attachment',
  filename: string,
  data: Uint8Array,
  opts: { lesson?: string; label?: string; tamperKey?: string } = {},
) {
  const lesson = opts.lesson ?? lessonId;
  const started = await actions.startLessonUpload({
    lessonId: lesson,
    kind,
    filename,
    size: data.length,
  });
  if (!started.ok) throw new Error(started.error);
  const { key, uploadId, partSize, urls } = started.data;
  const parts = [];
  for (const [index, url] of urls.entries()) {
    const body = data.subarray(index * partSize, (index + 1) * partSize);
    const response = await fetch(url, { method: 'PUT', body: Buffer.from(body) });
    expect(response.ok).toBe(true);
    parts.push({ partNumber: index + 1, etag: response.headers.get('etag')! });
  }
  const completed = await actions.completeLessonUpload({
    lessonId: lesson,
    kind,
    key: opts.tamperKey ?? key,
    uploadId,
    filename,
    label: opts.label,
    parts,
  });
  return { ...completed, key, partCount: urls.length };
}

async function download(storageKey: string) {
  const url = await storage.getSignedDownloadUrl({ storageKey, filename: 'x' });
  const response = await fetch(url);
  return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
}

describe.skipIf(!enabled)('upload file bài học lên kho S3', () => {
  beforeAll(async () => {
    await db.course.deleteMany({ where: { slug: { startsWith: P } } });
    const course = await db.course.create({
      data: { slug: `${P}khoa`, title: 'Upload', description: '', status: 'ACTIVE' },
    });
    courseId = course.id;
    lessonId = (await db.lesson.create({ data: { courseId, title: 'Bài 1', slug: 'bai-1' } })).id;
    otherLessonId = (await db.lesson.create({ data: { courseId, title: 'Bài 2', slug: 'bai-2' } }))
      .id;
  });

  afterAll(async () => {
    await db.course.deleteMany({ where: { slug: { startsWith: P } } });
    await db.$disconnect();
  });

  it('tài liệu 20 MB → upload 2 phần, lưu đúng kích thước, tải về đúng nội dung', async () => {
    const data = new Uint8Array(20 * 1024 * 1024).map((_, i) => (i * 31) % 251);
    const result = await upload('attachment', 'code-mau.zip', data, { label: 'Code mẫu buổi 1' });
    expect(result.ok).toBe(true);
    expect(result.partCount).toBe(2);
    const row = await db.lessonAttachment.findFirstOrThrow({ where: { lessonId } });
    expect([row.label, row.filename, row.sizeBytes]).toEqual([
      'Code mẫu buổi 1',
      'code-mau.zip',
      data.length,
    ]);
    expect(sha((await download(row.storageKey))!)).toBe(sha(data));
  }, 120_000);

  it('video: thay video mới thì xóa file cũ trên kho; gỡ video cũng xóa file', async () => {
    const first = await upload('video', 'bai1.mp4', new Uint8Array([1, 2, 3, 4]));
    expect(first.ok).toBe(true);
    const second = await upload('video', 'bai1-v2.mp4', new Uint8Array([5, 6, 7]));
    expect(second.ok && second.data).toEqual({ kind: 'video', name: 'bai1-v2.mp4', size: 3 });
    const lesson = await db.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    expect([lesson.videoKey, lesson.videoName, lesson.videoSize]).toEqual([
      second.key,
      'bai1-v2.mp4',
      3n,
    ]);
    expect(await storage.getObjectSize(first.key)).toBeNull();

    await actions.removeLessonVideo(lessonId);
    expect(await storage.getObjectSize(second.key)).toBeNull();
    expect((await db.lesson.findUniqueOrThrow({ where: { id: lessonId } })).videoKey).toBeNull();
  }, 60_000);

  it('chặn file sai loại / quá dung lượng / gắn file của bài khác', async () => {
    expect(
      await actions.startLessonUpload({
        lessonId,
        kind: 'slide',
        filename: 'slide.pptx',
        size: 10,
      }),
    ).toEqual({ ok: false, error: 'Slide PDF cần là file .pdf.' });
    expect(
      await actions.startLessonUpload({
        lessonId,
        kind: 'video',
        filename: 'a.mp4',
        size: 6 * 1024 ** 3,
      }),
    ).toEqual({ ok: false, error: 'Video tối đa 5 GB.' });

    // Upload vào bài 2 nhưng cố gắn vào bài 1.
    const started = await actions.startLessonUpload({
      lessonId: otherLessonId,
      kind: 'slide',
      filename: 's.pdf',
      size: 3,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const tampered = await actions.completeLessonUpload({
      lessonId,
      kind: 'slide',
      key: started.data.key,
      uploadId: started.data.uploadId,
      filename: 's.pdf',
      parts: [],
    });
    expect(tampered).toEqual({ ok: false, error: 'File không thuộc bài học này.' });
  }, 60_000);

  it('xóa bài học → xóa luôn slide và tài liệu trên kho', async () => {
    const slide = await upload('slide', 'slide.pdf', new Uint8Array([37, 80, 68, 70]));
    expect(slide.ok).toBe(true);
    const attachments = await db.lessonAttachment.findMany({ where: { lessonId } });
    await actions.deleteLesson(lessonId);
    expect(await storage.getObjectSize(slide.key)).toBeNull();
    for (const file of attachments) expect(await storage.getObjectSize(file.storageKey)).toBeNull();
  }, 60_000);
});
