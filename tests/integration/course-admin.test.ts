/** Test tích hợp các thao tác admin với khóa học: tạo nhanh, lưu thông tin, xóa. */
import { describe, it, expect, afterAll, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'admin', role: 'ADMIN' } }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const { createCourse, deleteCourse, saveCourse, setCourseContentComplete } =
  await import('@/server/actions/course');

const TITLE = 'It Course Lập trình C++';
afterAll(async () => {
  await db.course.deleteMany({ where: { slug: { startsWith: 'it-course-' } } });
  await db.$disconnect();
});

const base = {
  plannedLessons: 12,
  contentComplete: false,
  title: TITLE,
  slug: 'it-course-cpp',
  description: 'Học C++ từ đầu',
  coverUrl: '/images/cpp.png',
  level: 'Cơ bản',
  duration: '10 giờ',
  priceVnd: 0,
  compareAtVnd: '' as const,
  status: 'ACTIVE' as const,
  learnUrl: '',
};

describe('quản lý khóa học', () => {
  it('tạo khóa: slug tự sinh không dấu, trùng tên thì thêm số, lưu lộ trình', async () => {
    const first = await createCourse({ ...base, slug: '', title: TITLE });
    const second = await createCourse({ ...base, slug: '', title: TITLE });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    const [a, b] = await Promise.all([
      db.course.findUniqueOrThrow({ where: { id: first.data.id } }),
      db.course.findUniqueOrThrow({ where: { id: second.data.id } }),
    ]);
    expect([a.slug, a.status, a.plannedLessons, a.contentCompletedAt]).toEqual([
      'it-course-lap-trinh-c',
      'ACTIVE',
      12,
      null,
    ]);
    expect(b.slug).toBe('it-course-lap-trinh-c-2');
    expect(await createCourse({ ...base, slug: '', title: '   ' })).toEqual({
      ok: false,
      error: 'Nhập tên khóa học.',
    });
  });

  it('lưu thông tin: ảnh bìa, học phí, trạng thái; kiểm tra dữ liệu bằng tiếng Việt', async () => {
    const created = await createCourse({ ...base, slug: '', title: 'It Course Lưu' });
    if (!created.ok) throw new Error('create failed');
    const id = created.data.id;
    expect(await saveCourse(id, base)).toEqual({ ok: true, data: null });
    const saved = await db.course.findUniqueOrThrow({ where: { id } });
    expect([saved.slug, saved.coverUrl, saved.status, saved.priceVnd, saved.compareAtVnd]).toEqual([
      'it-course-cpp',
      '/images/cpp.png',
      'ACTIVE',
      0,
      null,
    ]);

    expect(await saveCourse(id, { ...base, priceVnd: 500000, compareAtVnd: 400000 })).toEqual({
      ok: false,
      error: 'Giá gốc (gạch ngang) phải lớn hơn học phí.',
    });
    expect((await saveCourse(id, { ...base, slug: 'Có Dấu' })).ok).toBe(false);
    expect(await saveCourse(id, { ...base, learnUrl: 'drive.google.com' })).toEqual({
      ok: false,
      error: 'Link học ngoài cần bắt đầu bằng http(s)://',
    });

    const other = await createCourse({ ...base, slug: '', title: 'It Course Khác' });
    if (!other.ok) throw new Error('create failed');
    expect(await saveCourse(other.data.id, base)).toEqual({
      ok: false,
      error: 'Đường dẫn đã dùng cho khóa học khác.',
    });
  });

  it('lộ trình chưa xác định; đánh dấu soạn xong giữ nguyên thời điểm khi lưu lại', async () => {
    const created = await createCourse({ ...base, slug: '', title: 'It Course Lộ trình' });
    if (!created.ok) throw new Error('create failed');
    const id = created.data.id;
    const input = { ...base, slug: 'it-course-lo-trinh', plannedLessons: '' as const };
    expect(await saveCourse(id, { ...input, contentComplete: true })).toEqual({
      ok: true,
      data: null,
    });
    const first = await db.course.findUniqueOrThrow({ where: { id } });
    expect(first.plannedLessons).toBeNull();
    expect(first.contentCompletedAt).toBeInstanceOf(Date);

    await saveCourse(id, { ...input, contentComplete: true, description: 'sửa mô tả' });
    const again = await db.course.findUniqueOrThrow({ where: { id } });
    expect(again.contentCompletedAt).toEqual(first.contentCompletedAt);

    expect(await setCourseContentComplete(id, false)).toEqual({ ok: true, data: null });
    expect((await db.course.findUniqueOrThrow({ where: { id } })).contentCompletedAt).toBeNull();
    expect((await saveCourse(id, { ...input, plannedLessons: 0 })).ok).toBe(false);
  });

  it('xóa khóa học → xóa luôn bài học, ghi danh', async () => {
    const created = await createCourse({ ...base, slug: '', title: 'It Course Xóa' });
    if (!created.ok) throw new Error('create failed');
    const id = created.data.id;
    await db.lesson.create({ data: { courseId: id, title: 'B1', slug: 'b1' } });
    expect(await deleteCourse(id)).toEqual({ ok: true, data: null });
    expect(await db.lesson.count({ where: { courseId: id } })).toBe(0);
    expect(await deleteCourse(id)).toEqual({ ok: false, error: 'Không tìm thấy khóa học.' });
  });
});
