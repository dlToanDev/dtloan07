import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSignedDownloadUrl } from '@/lib/storage';
import { ACCESS_MESSAGES, checkLessonAccess, getViewer } from '@/lib/courses/access';
import { contentTypeFor } from '@/lib/courses/uploads';

export const dynamic = 'force-dynamic';

/**
 * GET /api/courses/files/video/<lessonId>        → phát video bài giảng đã upload
 * GET /api/courses/files/slide/<lessonId>        → mở slide PDF ngay trên trình duyệt
 * GET /api/courses/files/attachment/<attachmentId> → tải tài liệu của bài
 * Chỉ người được học bài đó mới nhận link R2 (video hết hạn sau 4 giờ, file khác 1 giờ).
 * Trình phát video gọi lại route này khi tua (Range) — mỗi lần được chuyển sang link R2 mới.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;

  let file: { lessonId: string; storageKey: string; filename: string; inline: boolean } | null =
    null;
  if (kind === 'video') {
    const lesson = await db.lesson.findUnique({
      where: { id },
      select: { id: true, videoKey: true, videoName: true },
    });
    if (lesson?.videoKey)
      file = {
        lessonId: lesson.id,
        storageKey: lesson.videoKey,
        filename: lesson.videoName || 'video.mp4',
        inline: true,
      };
  } else if (kind === 'slide') {
    const lesson = await db.lesson.findUnique({
      where: { id },
      select: { id: true, slideKey: true, slideName: true },
    });
    if (lesson?.slideKey)
      file = {
        lessonId: lesson.id,
        storageKey: lesson.slideKey,
        filename: lesson.slideName || 'slide.pdf',
        inline: true,
      };
  } else if (kind === 'attachment') {
    const attachment = await db.lessonAttachment.findUnique({ where: { id } });
    if (attachment)
      file = {
        lessonId: attachment.lessonId,
        storageKey: attachment.storageKey,
        filename: attachment.filename,
        inline: false,
      };
  }
  if (!file) return NextResponse.json({ error: 'Không tìm thấy tài liệu.' }, { status: 404 });

  const access = await checkLessonAccess(file.lessonId, await getViewer());
  if (!access.ok)
    return NextResponse.json(
      { error: ACCESS_MESSAGES[access.reason] },
      { status: access.reason === 'login' ? 401 : 403 },
    );

  const url = await getSignedDownloadUrl({
    storageKey: file.storageKey,
    filename: file.filename,
    expiresInSeconds: kind === 'video' ? 4 * 3600 : 3600,
    inline: file.inline,
    ...(file.inline && { contentType: contentTypeFor(file.filename) }),
  });
  return NextResponse.redirect(url, {
    status: 302,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
