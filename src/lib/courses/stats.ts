/** Thống kê học viên của một khóa — hàm thuần, dữ liệu lấy từ DB ở nơi gọi. */

export interface StatsInput {
  /** Bài đã xuất bản của khóa (bài nháp không tính vào tiến độ). */
  lessonIds: string[];
  /** Bài tập thuộc các bài đã xuất bản. */
  exerciseIds: string[];
  students: { userId: string; email: string; name: string | null; enrolledAt: Date }[];
  progress: { userId: string; lessonId: string; completedAt: Date }[];
  /** Mỗi cặp (học viên, bài tập) đã có ít nhất một bài nộp đúng. */
  solved: { userId: string; exerciseId: string }[];
  /** Lần nộp bài gần nhất của mỗi học viên trong khóa. */
  lastSubmissionAt: { userId: string; at: Date }[];
}

export interface StudentStats {
  userId: string;
  email: string;
  name: string | null;
  enrolledAt: Date;
  lessonsDone: number;
  lessonsTotal: number;
  lessonPercent: number;
  exercisesSolved: number;
  exercisesTotal: number;
  /** null khi khóa chưa có bài tập. */
  exercisePercent: number | null;
  lastActiveAt: Date;
}

export interface CourseStats {
  students: StudentStats[];
  /** Trung bình % bài học đã hoàn thành của các học viên; null khi chưa có học viên / bài. */
  completionPercent: number | null;
  /** Tổng bài tập đạt / (số học viên × số bài tập); null khi chưa có học viên / bài tập. */
  exercisePassPercent: number | null;
}

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function computeCourseStats(input: StatsInput): CourseStats {
  const lessons = new Set(input.lessonIds);
  const exercises = new Set(input.exerciseIds);
  const lessonsDone = new Map<string, number>();
  const solvedCount = new Map<string, number>();
  const lastActive = new Map<string, number>();
  const touch = (userId: string, at: Date) =>
    lastActive.set(userId, Math.max(lastActive.get(userId) ?? 0, at.getTime()));

  for (const row of input.progress) {
    if (!lessons.has(row.lessonId)) continue;
    lessonsDone.set(row.userId, (lessonsDone.get(row.userId) ?? 0) + 1);
    touch(row.userId, row.completedAt);
  }
  for (const row of input.solved)
    if (exercises.has(row.exerciseId))
      solvedCount.set(row.userId, (solvedCount.get(row.userId) ?? 0) + 1);
  for (const row of input.lastSubmissionAt) touch(row.userId, row.at);

  const students = input.students.map((student): StudentStats => {
    const done = lessonsDone.get(student.userId) ?? 0;
    const solved = solvedCount.get(student.userId) ?? 0;
    return {
      ...student,
      lessonsDone: done,
      lessonsTotal: lessons.size,
      lessonPercent: percent(done, lessons.size),
      exercisesSolved: solved,
      exercisesTotal: exercises.size,
      exercisePercent: exercises.size ? percent(solved, exercises.size) : null,
      lastActiveAt: new Date(
        Math.max(lastActive.get(student.userId) ?? 0, student.enrolledAt.getTime()),
      ),
    };
  });

  const n = students.length;
  return {
    students,
    completionPercent:
      n && lessons.size
        ? Math.round(students.reduce((sum, s) => sum + s.lessonPercent, 0) / n)
        : null,
    exercisePassPercent:
      n && exercises.size
        ? percent(
            students.reduce((sum, s) => sum + s.exercisesSolved, 0),
            n * exercises.size,
          )
        : null,
  };
}

/** Xuất bảng học viên ra CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt). */
export function studentsToCsv(courseTitle: string, students: StudentStats[]): string {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const date = (d: Date) => d.toLocaleDateString('vi-VN');
  const rows = [
    [
      'Khóa học',
      'Học viên',
      'Email',
      'Ngày vào học',
      'Bài học xong',
      'Tổng bài',
      '% bài học',
      'Bài tập đạt',
      'Tổng bài tập',
      '% bài tập',
      'Hoạt động gần nhất',
    ],
    ...students.map((s) => [
      courseTitle,
      s.name ?? '',
      s.email,
      date(s.enrolledAt),
      s.lessonsDone,
      s.lessonsTotal,
      `${s.lessonPercent}%`,
      s.exercisesSolved,
      s.exercisesTotal,
      s.exercisePercent === null ? '' : `${s.exercisePercent}%`,
      date(s.lastActiveAt),
    ]),
  ];
  return '﻿' + rows.map((row) => row.map(escape).join(',')).join('\r\n');
}
