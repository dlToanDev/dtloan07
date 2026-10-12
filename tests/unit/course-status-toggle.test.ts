import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toggleCourseStatus } from '@/server/actions/course';
import { toggleLessonStatus } from '@/server/actions/course-lessons';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    course: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    lesson: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe('Course and Lesson Status Toggle Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    } as never);
  });

  describe('toggleCourseStatus', () => {
    it('1. Đang mở (ACTIVE) -> bấm chuyển thành Tạm dừng (DRAFT)', async () => {
      vi.mocked(db.course.findUnique).mockResolvedValue({
        id: 'c1',
        status: 'ACTIVE',
        slug: 'toan',
      } as never);
      vi.mocked(db.course.update).mockResolvedValue({
        id: 'c1',
        status: 'DRAFT',
      } as never);

      const res = await toggleCourseStatus('c1');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('DRAFT');
      }
      expect(db.course.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: 'DRAFT' },
      });
    });

    it('2. Đang dừng (DRAFT) -> bấm chuyển thành Phát hành (ACTIVE)', async () => {
      vi.mocked(db.course.findUnique).mockResolvedValue({
        id: 'c1',
        status: 'DRAFT',
        slug: 'toan',
      } as never);
      vi.mocked(db.course.update).mockResolvedValue({
        id: 'c1',
        status: 'ACTIVE',
      } as never);

      const res = await toggleCourseStatus('c1');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('ACTIVE');
      }
      expect(db.course.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: 'ACTIVE' },
      });
    });

    it('3. Cho phép chỉ định cụ thể targetStatus', async () => {
      vi.mocked(db.course.findUnique).mockResolvedValue({
        id: 'c1',
        status: 'DRAFT',
        slug: 'toan',
      } as never);
      vi.mocked(db.course.update).mockResolvedValue({
        id: 'c1',
        status: 'UPCOMING',
      } as never);

      const res = await toggleCourseStatus('c1', 'UPCOMING');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('UPCOMING');
      }
      expect(db.course.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: 'UPCOMING' },
      });
    });
  });

  describe('toggleLessonStatus', () => {
    it('1. Đổi bài học từ DRAFT sang PUBLISHED', async () => {
      vi.mocked(db.lesson.findUnique).mockResolvedValue({
        id: 'l1',
        status: 'DRAFT',
        courseId: 'c1',
      } as never);
      vi.mocked(db.course.findUnique).mockResolvedValue({
        id: 'c1',
        slug: 'toan',
      } as never);
      vi.mocked(db.lesson.update).mockResolvedValue({
        id: 'l1',
        status: 'PUBLISHED',
      } as never);

      const res = await toggleLessonStatus('l1');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('PUBLISHED');
      }
    });

    it('2. Đổi bài học từ PUBLISHED về DRAFT', async () => {
      vi.mocked(db.lesson.findUnique).mockResolvedValue({
        id: 'l1',
        status: 'PUBLISHED',
        courseId: 'c1',
      } as never);
      vi.mocked(db.course.findUnique).mockResolvedValue({
        id: 'c1',
        slug: 'toan',
      } as never);
      vi.mocked(db.lesson.update).mockResolvedValue({
        id: 'l1',
        status: 'DRAFT',
      } as never);

      const res = await toggleLessonStatus('l1');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('DRAFT');
      }
    });
  });
});
