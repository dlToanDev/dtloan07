import { describe, it, expect } from 'vitest';
import { allExercisesSolved, lessonStates, nextLessonId } from '@/lib/courses/progress';
import { parseVideoEmbed } from '@/lib/courses/video';
import { Cooldown, Semaphore } from '@/lib/judge/limiter';

describe('lessonStates', () => {
  const ids = ['b1', 'b2', 'b3', 'b4'];

  it('bài đầu mở, bài sau chỉ mở khi bài trước xong', () => {
    expect([...lessonStates(ids, new Set()).values()]).toEqual([
      'available',
      'locked',
      'locked',
      'locked',
    ]);
    expect([...lessonStates(ids, new Set(['b1', 'b2'])).values()]).toEqual([
      'completed',
      'completed',
      'available',
      'locked',
    ]);
  });

  it('admin (bypass) mở hết, vẫn giữ dấu đã xong', () => {
    expect([...lessonStates(ids, new Set(['b1']), true).values()]).toEqual([
      'completed',
      'available',
      'available',
      'available',
    ]);
  });

  it('bài tiếp theo nên học', () => {
    expect(nextLessonId(ids, lessonStates(ids, new Set(['b1'])))).toBe('b2');
    expect(nextLessonId(ids, lessonStates(ids, new Set(ids)))).toBe('b4');
    expect(nextLessonId([], new Map())).toBeUndefined();
  });

  it('bài hoàn thành khi mọi bài tập đã đúng; bài không có bài tập thì không tự xong', () => {
    expect(allExercisesSolved(['e1', 'e2'], new Set(['e1', 'e2', 'x']))).toBe(true);
    expect(allExercisesSolved(['e1', 'e2'], new Set(['e1']))).toBe(false);
    expect(allExercisesSolved([], new Set(['e1']))).toBe(false);
  });
});

describe('parseVideoEmbed', () => {
  it('đọc các kiểu link YouTube', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=abc',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ])
      expect(parseVideoEmbed(url)?.embedUrl).toBe(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
      );
    expect(parseVideoEmbed('https://youtu.be/dQw4w9WgXcQ?t=90')?.embedUrl).toContain('&start=90');
  });

  it('đọc Vimeo, bỏ qua link lạ', () => {
    expect(parseVideoEmbed('https://vimeo.com/76979871')).toEqual({
      provider: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/76979871',
    });
    expect(parseVideoEmbed('https://example.com/video.mp4')).toBeNull();
    expect(parseVideoEmbed('không phải link')).toBeNull();
    expect(parseVideoEmbed('')).toBeNull();
  });
});

describe('Semaphore / Cooldown', () => {
  it('không quá số việc chạy cùng lúc', async () => {
    const semaphore = new Semaphore(2);
    let running = 0;
    let peak = 0;
    const task = () =>
      semaphore.use(async () => {
        peak = Math.max(peak, ++running);
        await new Promise((r) => setTimeout(r, 5));
        running--;
      });
    await Promise.all(Array.from({ length: 7 }, task));
    expect(peak).toBe(2);
  });

  it('bắt chờ giữa hai lần nộp', () => {
    const cooldown = new Cooldown(5000);
    expect(cooldown.take('u1', 1000)).toBe(0);
    expect(cooldown.take('u1', 3000)).toBe(3000);
    expect(cooldown.take('u2', 3000)).toBe(0);
    expect(cooldown.take('u1', 6000)).toBe(0);
  });
});

describe('upload file bài học', async () => {
  const { buildStorageKey, contentTypeFor, keyBelongsTo, partCount, PART_SIZE, validateUpload } =
    await import('@/lib/courses/uploads');
  const GB = 1024 ** 3;

  it('kiểm tra dung lượng và loại file theo từng loại', () => {
    expect(validateUpload('video', 'bai1.mp4', 2 * GB)).toBeNull();
    expect(validateUpload('video', 'bai1.mp4', 6 * GB)).toBe('Video tối đa 5 GB.');
    expect(validateUpload('video', 'bai1.avi', 1000)).toContain('.mp4');
    expect(validateUpload('slide', 'slide.PDF', 1000)).toBeNull();
    expect(validateUpload('slide', 'slide.pptx', 1000)).toContain('.pdf');
    expect(validateUpload('attachment', 'code.zip', 400 * 1024 ** 2)).toBeNull();
    expect(validateUpload('attachment', 'big.zip', 600 * 1024 ** 2)).toBe(
      'Tài liệu tối đa 500 MB.',
    );
    expect(validateUpload('attachment', 'rong.txt', 0)).toBe('File rỗng.');
  });

  it('chia phần 16 MB, file nhỏ vẫn là 1 phần', () => {
    expect(partCount(1)).toBe(1);
    expect(partCount(PART_SIZE)).toBe(1);
    expect(partCount(PART_SIZE + 1)).toBe(2);
    expect(partCount(5 * GB)).toBe(320);
  });

  it('key do server đặt, chỉ nhận key đúng bài và đúng loại', () => {
    const key = buildStorageKey('c1', 'l1', 'video', 'Bài 1 (final).MP4');
    expect(key).toMatch(/^courses\/c1\/l1\/video-[0-9a-f-]{36}\.mp4$/);
    expect(keyBelongsTo(key, 'c1', 'l1', 'video')).toBe(true);
    expect(keyBelongsTo(key, 'c1', 'l2', 'video')).toBe(false);
    expect(keyBelongsTo(key, 'c1', 'l1', 'slide')).toBe(false);
    expect(keyBelongsTo('courses/c1/l1/video-../../x', 'c1', 'l1', 'video')).toBe(false);
  });

  it('content-type để trình duyệt phát video / mở PDF', () => {
    expect(contentTypeFor('a.mp4')).toBe('video/mp4');
    expect(contentTypeFor('a.webm')).toBe('video/webm');
    expect(contentTypeFor('a.pdf')).toBe('application/pdf');
    expect(contentTypeFor('a.zip')).toBe('application/octet-stream');
  });
});

describe('thống kê khóa học', async () => {
  const { computeCourseStats, studentsToCsv } = await import('@/lib/courses/stats');
  const d = (day: number) => new Date(Date.UTC(2026, 9, day));
  const input = {
    lessonIds: ['l1', 'l2', 'l3', 'l4'],
    exerciseIds: ['e1', 'e2'],
    students: [
      { userId: 'an', email: 'an@x.com', name: 'An', enrolledAt: d(1) },
      { userId: 'binh', email: 'binh@x.com', name: null, enrolledAt: d(2) },
    ],
    progress: [
      { userId: 'an', lessonId: 'l1', completedAt: d(3) },
      { userId: 'an', lessonId: 'l2', completedAt: d(5) },
      { userId: 'an', lessonId: 'nhap', completedAt: d(9) }, // bài nháp / bài khóa khác: bỏ qua
    ],
    solved: [
      { userId: 'an', exerciseId: 'e1' },
      { userId: 'an', exerciseId: 'e2' },
      { userId: 'binh', exerciseId: 'e1' },
    ],
    lastSubmissionAt: [{ userId: 'binh', at: d(7) }],
  };

  it('tiến độ từng học viên và tổng của khóa', () => {
    const stats = computeCourseStats(input);
    expect(stats.students.map((s) => [s.userId, s.lessonPercent, s.exercisePercent])).toEqual([
      ['an', 50, 100],
      ['binh', 0, 50],
    ]);
    expect(stats.completionPercent).toBe(25); // (50 + 0) / 2
    expect(stats.exercisePassPercent).toBe(75); // 3 / (2 × 2)
    expect(stats.students[0]!.lastActiveAt).toEqual(d(5));
    expect(stats.students[1]!.lastActiveAt).toEqual(d(7));
  });

  it('chưa có học viên / bài tập → không có tỷ lệ', () => {
    expect(computeCourseStats({ ...input, students: [] })).toMatchObject({
      completionPercent: null,
      exercisePassPercent: null,
    });
    const noExercise = computeCourseStats({ ...input, exerciseIds: [] });
    expect(noExercise.exercisePassPercent).toBeNull();
    expect(noExercise.students[0]!.exercisePercent).toBeNull();
  });

  it('CSV có BOM cho Excel, bọc ô có dấu phẩy', () => {
    const csv = studentsToCsv('C++, cơ bản', computeCourseStats(input).students);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"C++, cơ bản",An,an@x.com');
    expect(lines[1]).toContain('50%');
  });
});
