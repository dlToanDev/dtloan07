/** Test tích hợp: tạo bài từ file Word / Markdown và nhập nội dung vào bài đang soạn. */
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'admin', role: 'ADMIN' } }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const { createLessonsFromFiles, importLessonContent } =
  await import('@/server/actions/course-lessons');

let courseId = '';
const savedImages: string[] = [];
const docx = () =>
  new File([readFileSync('tests/fixtures/bai-giang.docx')], 'bai-giang.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

beforeAll(async () => {
  await db.course.deleteMany({ where: { slug: 'it-import-khoa' } });
  courseId = (
    await db.course.create({ data: { slug: 'it-import-khoa', title: 'Import', description: '' } })
  ).id;
});

afterAll(async () => {
  await db.course.deleteMany({ where: { slug: 'it-import-khoa' } });
  for (const url of savedImages) rmSync(path.join(process.cwd(), 'public', url), { force: true });
  await db.$disconnect();
});

describe('nhập bài học từ file', () => {
  it('tạo nhiều bài, xếp theo tên file, tên bài lấy từ tiêu đề, báo lỗi file sai loại', async () => {
    const form = new FormData();
    form.set('courseId', courseId);
    form.append('files', new File(['# Vòng lặp\n\nfor, while'], 'Bai-02.md'));
    form.append('files', docx());
    form.append('files', new File(['---\ntitle: Nhập môn\n---\nXin chào'], 'Bai-01.mdx'));
    form.append('files', new File(['abc'], 'slide.pptx'));
    const result = await createLessonsFromFiles(form);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.errors).toEqual([expect.stringContaining('slide.pptx')]);

    const lessons = await db.lesson.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
    });
    expect(lessons.map((l) => [l.title, l.status])).toEqual([
      ['Nhập môn', 'DRAFT'],
      ['Vòng lặp', 'DRAFT'],
      ['Bài 1: Biến và kiểu dữ liệu', 'DRAFT'],
    ]);
    expect(lessons[1]!.content).toBe('for, while');
    const image = lessons[2]!.content.match(/\/images\/lessons\/[\w-]+\.png/)?.[0];
    expect(image).toBeTruthy();
    savedImages.push(image!);
    expect(readFileSync(path.join(process.cwd(), 'public', image!)).length).toBeGreaterThan(0);
  });

  it('nhập nội dung vào bài đang soạn: trả nội dung, chưa ghi vào DB', async () => {
    const form = new FormData();
    form.set('file', docx());
    const result = await importLessonContent(form);
    expect(result.ok && result.data.title).toBe('Bài 1: Biến và kiểu dữ liệu');
    if (result.ok) {
      expect(result.data.markdown).toContain('| int | 4 byte |');
      savedImages.push(result.data.markdown.match(/\/images\/lessons\/[\w-]+\.png/)![0]);
    }
    const bad = new FormData();
    bad.set('file', new File(['x'], 'bai.doc'));
    expect((await importLessonContent(bad)).ok).toBe(false);
  });
});
