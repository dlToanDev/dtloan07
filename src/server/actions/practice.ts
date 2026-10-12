'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getViewer } from '@/lib/courses/access';
import { auth } from '@/lib/auth';
import {
  sanitizeQuestionsForStudent,
  type QuizQuestion,
  type QuizOption,
  type QuizQuestionType,
} from '@/lib/courses/quiz';
import { isLanguageKey, type LanguageKey } from '@/lib/judge/languages';
import { importDocx, saveImportedImage } from '@/lib/courses/content-import';
import {
  parseExerciseDocument,
  type ParsedExerciseData,
} from '@/lib/courses/exercise-document-parser';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
  }
}

export interface PracticeExerciseListItem {
  id: string;
  title: string;
  type: 'CODE' | 'QUIZ';
  category: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  hasPassage: boolean;
  hasAudio: boolean;
  hasImage: boolean;
  hasVideo: boolean;
  questionsCount: number;
  testCasesCount: number;
  languages: string[];
  solved?: boolean;
  courseTitle?: string | null;
  lessonTitle?: string | null;
  createdAt: Date;
}

export interface PracticeFilters {
  type?: 'ALL' | 'CODE' | 'QUIZ';
  category?: string;
  difficulty?: string;
  hasMedia?: 'ALL' | 'AUDIO' | 'VIDEO' | 'PASSAGE';
  search?: string;
}

/** Lấy danh sách các bài tập mở trên trang Luyện đề (công khai, miễn phí cho tất cả mọi người) */
export async function getPracticeExercises(filters: PracticeFilters = {}) {
  const viewer = await getViewer();
  const where: Prisma.ExerciseWhereInput = {
    isPublicPractice: true,
  };

  if (filters.type && filters.type !== 'ALL') {
    where.type = filters.type;
  }
  if (filters.category && filters.category !== 'ALL') {
    where.category = filters.category;
  }
  if (filters.difficulty && filters.difficulty !== 'ALL') {
    where.difficulty = filters.difficulty;
  }
  if (filters.hasMedia) {
    if (filters.hasMedia === 'AUDIO') where.audioUrl = { not: null };
    else if (filters.hasMedia === 'VIDEO') where.videoUrl = { not: null };
    else if (filters.hasMedia === 'PASSAGE') where.passage = { not: null };
  }
  if (filters.search?.trim()) {
    where.OR = [
      { title: { contains: filters.search.trim(), mode: 'insensitive' } },
      { statement: { contains: filters.search.trim(), mode: 'insensitive' } },
      { category: { contains: filters.search.trim(), mode: 'insensitive' } },
    ];
  }

  const [exercises, solvedSubmissions] = await Promise.all([
    db.exercise.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        lesson: {
          select: {
            title: true,
            course: { select: { title: true } },
          },
        },
        testCases: { select: { id: true } },
      },
    }),
    viewer
      ? db.submission.findMany({
          where: {
            userId: viewer.id,
            verdict: 'ACCEPTED',
          },
          select: { exerciseId: true },
          distinct: ['exerciseId'],
        })
      : Promise.resolve([]),
  ]);

  const solvedSet = new Set(solvedSubmissions.map((s) => s.exerciseId));

  const items: PracticeExerciseListItem[] = exercises.map((e) => {
    const questions = Array.isArray(e.questions) ? (e.questions as unknown[]) : [];
    return {
      id: e.id,
      title: e.title,
      type: e.type,
      category: e.category,
      difficulty: (e.difficulty as 'EASY' | 'MEDIUM' | 'HARD') || 'MEDIUM',
      hasPassage: Boolean(e.passage?.trim()),
      hasAudio: Boolean(e.audioUrl?.trim()),
      hasImage: Boolean(e.imageUrl?.trim()),
      hasVideo: Boolean(e.videoUrl?.trim()),
      questionsCount: questions.length,
      testCasesCount: e.testCases.length,
      languages: e.languages,
      solved: solvedSet.has(e.id),
      courseTitle: e.lesson?.course.title,
      lessonTitle: e.lesson?.title,
      createdAt: e.createdAt,
    };
  });

  return items;
}

/** Lấy chi tiết bài tập luyện đề (bao gồm kho học liệu đa phương tiện) */
export async function getPracticeExerciseDetail(id: string) {
  const viewer = await getViewer();
  const exercise = await db.exercise.findUnique({
    where: { id },
    include: {
      testCases: {
        where: { isSample: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
      lesson: {
        select: {
          title: true,
          course: { select: { title: true, slug: true } },
        },
      },
    },
  });

  if (!exercise || (!exercise.isPublicPractice && !viewer?.isAdmin)) {
    return null;
  }

  const [lastSubmission, isSolved] = viewer
    ? await Promise.all([
        db.submission.findFirst({
          where: { exerciseId: id, userId: viewer.id },
          orderBy: { createdAt: 'desc' },
        }),
        db.submission.count({
          where: { exerciseId: id, userId: viewer.id, verdict: 'ACCEPTED' },
        }),
      ])
    : [null, 0];

  const totalTests = await db.testCase.count({ where: { exerciseId: id } });

  return {
    exercise: {
      id: exercise.id,
      title: exercise.title,
      type: exercise.type,
      statement: exercise.statement,
      passage: exercise.passage,
      audioUrl: exercise.audioUrl,
      imageUrl: exercise.imageUrl,
      videoUrl: exercise.videoUrl,
      category: exercise.category,
      difficulty: exercise.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
      timeLimitMs: exercise.timeLimitMs,
      memoryLimitMb: exercise.memoryLimitMb,
      languages: exercise.languages.filter(isLanguageKey),
      starterCode: (exercise.starterCode ?? {}) as Partial<Record<LanguageKey, string>>,
      samples: exercise.testCases.map(({ input, expectedOutput }) => ({ input, expectedOutput })),
      totalTests,
      questions: sanitizeQuestionsForStudent(exercise.questions),
      courseTitle: exercise.lesson?.course.title,
      lessonTitle: exercise.lesson?.title,
    },
    solved: isSolved > 0,
    lastSubmission: lastSubmission
      ? {
          language: lastSubmission.language,
          code: lastSubmission.code,
          verdict: lastSubmission.verdict,
          passed: lastSubmission.passed,
          total: lastSubmission.total,
          details: (lastSubmission.details as Prisma.JsonValue) ?? null,
          message: lastSubmission.message,
        }
      : null,
  };
}

/** Admin: Bật/Tắt đưa bài tập lên trang Luyện đề miễn phí */
export async function toggleExercisePractice(exerciseId: string, isPublicPractice: boolean) {
  await requireAdmin();
  const exercise = await db.exercise.update({
    where: { id: exerciseId },
    data: { isPublicPractice },
    select: { id: true, title: true, isPublicPractice: true },
  });
  revalidatePath('/courses/practice');
  revalidatePath('/admin/practice');
  revalidatePath(`/courses/practice/${exerciseId}`);
  return { ok: true, data: exercise };
}

/** Admin: Lấy danh sách toàn bộ bài tập trong kho (gồm cả bài trong khóa học và bài độc lập) */
export async function getAdminPracticeBankList() {
  await requireAdmin();
  const exercises = await db.exercise.findMany({
    orderBy: [{ isPublicPractice: 'desc' }, { createdAt: 'desc' }],
    include: {
      lesson: {
        select: {
          title: true,
          course: { select: { title: true } },
        },
      },
      testCases: { select: { id: true } },
      _count: { select: { submissions: true } },
    },
  });

  return exercises.map((e) => {
    const questions = Array.isArray(e.questions) ? (e.questions as unknown[]) : [];
    return {
      id: e.id,
      title: e.title,
      type: e.type,
      isPublicPractice: e.isPublicPractice,
      category: e.category,
      difficulty: (e.difficulty as 'EASY' | 'MEDIUM' | 'HARD') || 'MEDIUM',
      hasPassage: Boolean(e.passage?.trim()),
      hasAudio: Boolean(e.audioUrl?.trim()),
      hasImage: Boolean(e.imageUrl?.trim()),
      hasVideo: Boolean(e.videoUrl?.trim()),
      questionsCount: questions.length,
      testCasesCount: e.testCases.length,
      submissionCount: e._count.submissions,
      courseTitle: e.lesson?.course.title ?? 'Kho bài tập mở',
      lessonTitle: e.lesson?.title ?? 'Đề độc lập',
      createdAt: e.createdAt,
    };
  });
}

/** Admin: Tạo bài tập luyện đề độc lập (không cần phải thuộc bài học nào) */
export async function createStandalonePracticeExercise(type: 'CODE' | 'QUIZ' = 'CODE') {
  await requireAdmin();
  const isQuiz = type === 'QUIZ';
  const count = await db.exercise.count({ where: { isPublicPractice: true } });

  const exercise = await db.exercise.create({
    data: {
      type,
      title: isQuiz ? `Đề trắc nghiệm & Ngữ liệu #${count + 1}` : `Bài tập Lập trình #${count + 1}`,
      isPublicPractice: true,
      category: isQuiz ? 'Đọc hiểu & Nghe hiểu' : 'Thuật toán & Lập trình',
      difficulty: 'MEDIUM',
      sortOrder: (count + 1) * 10,
      languages: isQuiz ? [] : ['cpp', 'python', 'javascript'],
      statement: isQuiz
        ? '### Hướng dẫn làm bài\nĐọc kỹ đoạn văn hoặc lắng nghe đoạn âm thanh dưới đây, sau đó chọn đáp án chính xác nhất cho từng câu hỏi.'
        : '### Đề bài\nCho mảng số nguyên `nums` và một số nguyên `target`. Hãy tìm hai số trong mảng sao cho tổng của chúng bằng `target` và in ra chỉ số của chúng.',
      passage: isQuiz
        ? 'In modern software engineering, automated CI/CD pipelines play an indispensable role in maintaining deployment velocity and software reliability. Continuous integration ensures code quality by triggering automated test suites and linters on each pull request, while continuous delivery handles seamless artifact deployment to production clusters.'
        : null,
      questions: isQuiz
        ? [
            {
              id: 'q-sample-1',
              type: 'SINGLE',
              prompt:
                'Theo đoạn văn trên, CI/CD pipeline đóng vai trò quan trọng nhất trong việc gì?',
              options: [
                {
                  id: 'opt-1',
                  text: 'Duy trì tốc độ triển khai và độ tin cậy phần mềm',
                  isCorrect: true,
                },
                {
                  id: 'opt-2',
                  text: 'Giảm thiểu hoàn toàn chi phí phần cứng server',
                  isCorrect: false,
                },
                {
                  id: 'opt-3',
                  text: 'Thay thế lập trình viên viết code tự động',
                  isCorrect: false,
                },
                { id: 'opt-4', text: 'Chỉ phục vụ cho việc gửi email marketing', isCorrect: false },
              ],
              explanation:
                'Đoạn văn khẳng định: "CI/CD pipelines play an indispensable role in maintaining deployment velocity and software reliability".',
            },
            {
              id: 'q-sample-2',
              type: 'SINGLE',
              prompt:
                'Thành phần Continuous Integration (CI) làm nhiệm vụ gì mỗi khi có pull request mới?',
              options: [
                {
                  id: 'opt-2a',
                  text: 'Kích hoạt bộ kiểm thử tự động (automated tests) và linters',
                  isCorrect: true,
                },
                { id: 'opt-2b', text: 'Xóa toàn bộ mã nguồn cũ', isCorrect: false },
                { id: 'opt-2c', text: 'Tự động thanh toán hóa đơn cloud', isCorrect: false },
              ],
              explanation:
                'Đoạn văn nêu: "Continuous integration ensures code quality by triggering automated test suites and linters on each pull request".',
            },
          ]
        : [],
      starterCode: isQuiz
        ? {}
        : {
            python:
              'def two_sum(nums, target):\n    # Viết code của bạn ở đây\n    pass\n\nif __name__ == "__main__":\n    import sys\n    lines = sys.stdin.read().split()\n    if lines:\n        target = int(lines[0])\n        nums = [int(x) for x in lines[1:]]\n        # TODO: in ra kết quả\n',
            cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Đọc input và giải quyết bài toán\n    return 0;\n}\n',
          },
      testCases: !isQuiz
        ? {
            create: [
              { input: '9 2 7 11 15', expectedOutput: '0 1', isSample: true, sortOrder: 0 },
              { input: '6 3 2 4', expectedOutput: '1 2', isSample: true, sortOrder: 1 },
              { input: '6 3 3', expectedOutput: '0 1', isSample: false, sortOrder: 2 },
            ],
          }
        : undefined,
    },
  });

  revalidatePath('/courses/practice');
  revalidatePath('/admin/practice');
  return { ok: true, data: { id: exercise.id } };
}

/** Tạo bài tập mẫu đầy đủ (Âm thanh, Video, Đoạn văn, Code, Trắc nghiệm) để kiểm thử */
export async function seedSamplePracticeExercises() {
  await requireAdmin();

  // 1. Bài trắc nghiệm có ĐOẠN VĂN & ÂM THANH (Listening & Reading)
  await db.exercise.create({
    data: {
      type: 'QUIZ',
      title: 'Luyện đề TOEIC Listening & Reading: Automated Systems in DevOps',
      isPublicPractice: true,
      category: 'Tiếng Anh & Đọc hiểu Chuyên ngành',
      difficulty: 'MEDIUM',
      sortOrder: 10,
      statement:
        '### Hướng dẫn bài thi\nLắng nghe đoạn audio hội thoại mẫu và đọc ngữ liệu email đính kèm bên dưới để trả lời các câu hỏi trắc nghiệm.',
      passage:
        'Subject: Urgent: Scheduled Maintenance Window for Kubernetes Cluster\nFrom: sysadmin@dltoan07.com\nTo: engineering-team@dltoan07.com\n\nDear Team,\n\nPlease be informed that our production Kubernetes cluster (Region AP-Southeast-1) will undergo scheduled maintenance tonight between 02:00 AM and 04:00 AM GMT+7. During this window, all deployments and database sync jobs will be paused temporarily.\n\nAll public-facing HTTP APIs will remain available with 99.9% uptime thanks to multi-zone redundancy, but please avoid pushing new Docker container images until the maintenance is confirmed completed.\n\nBest regards,\nHoang Anh Toan - Infrastructure Lead',
      audioUrl: 'https://cdn.freesound.org/previews/612/612080_5674468-lq.mp3', // Sample high quality sound
      videoUrl: 'https://www.youtube.com/embed/sal78ACtGTc',
      questions: [
        {
          id: 'devops-q1',
          type: 'SINGLE',
          prompt: 'Khoảng thời gian bảo trì hệ thống diễn ra lúc mấy giờ?',
          options: [
            { id: 't1', text: 'Từ 02:00 AM đến 04:00 AM GMT+7', isCorrect: true },
            { id: 't2', text: 'Từ 08:00 AM đến 10:00 AM GMT+7', isCorrect: false },
            { id: 't3', text: 'Từ 12:00 PM đến 02:00 PM GMT+7', isCorrect: false },
          ],
          explanation:
            'Trong email ghi rõ: "scheduled maintenance tonight between 02:00 AM and 04:00 AM GMT+7".',
        },
        {
          id: 'devops-q2',
          type: 'SINGLE',
          prompt: 'Đội ngũ phát triển được yêu cầu KHÔNG làm điều gì trong thời gian bảo trì?',
          options: [
            { id: 't2a', text: 'Không đẩy (push) image Docker container mới', isCorrect: true },
            { id: 't2b', text: 'Không truy cập trang web', isCorrect: false },
            { id: 't2c', text: 'Không gửi email cho khách hàng', isCorrect: false },
          ],
          explanation:
            'Email có câu: "please avoid pushing new Docker container images until the maintenance is confirmed completed".',
        },
        {
          id: 'devops-q3',
          type: 'MULTIPLE',
          prompt:
            'Những hệ thống nào vẫn đảm bảo hoạt động bình thường trong thời gian bảo trì? (Chọn các phương án đúng)',
          options: [
            {
              id: 't3a',
              text: 'Các cổng HTTP API công khai với người dùng (nhờ multi-zone redundancy)',
              isCorrect: true,
            },
            { id: 't3b', text: 'Database sync jobs', isCorrect: false },
            { id: 't3c', text: 'Các trang web chính chủ', isCorrect: true },
          ],
          explanation:
            'Public-facing HTTP APIs vẫn hoạt động 99.9% nhờ multi-zone, trong khi database sync jobs bị tạm dừng (paused).',
        },
      ],
    },
  });

  // 2. Bài tập Code có VIDEO hướng dẫn & Đoạn văn mô tả thuật toán
  await db.exercise.create({
    data: {
      type: 'CODE',
      title: 'Lập trình: Tìm chuỗi con đối xứng dài nhất (Longest Palindromic Substring)',
      isPublicPractice: true,
      category: 'Cấu trúc dữ liệu & Thuật toán',
      difficulty: 'HARD',
      sortOrder: 20,
      statement:
        '### Bài toán\nCho chuỗi ký tự `s`. Hãy tìm và in ra chuỗi con đối xứng dài nhất trong chuỗi `s`.\n\nMột chuỗi được gọi là chuỗi đối xứng (Palindrome) nếu đọc xuôi và ngược đều giống nhau (ví dụ: `babad` -> `bab` hoặc `aba`).\n\n### Ràng buộc\n- $1 \\le s.length \\le 1000$\n- $s$ chỉ gồm các chữ số và chữ cái tiếng Anh thường/hoa.',
      passage:
        'Lý thuyết thuật toán mở rộng từ tâm (Expand Around Center):\nChuỗi đối xứng có thể có tâm là 1 ký tự (độ dài lẻ: vd "aba") hoặc nằm giữa 2 ký tự (độ dài chẵn: vd "abba"). Bằng cách duyệt qua mọi tâm khả dĩ từ $0$ đến $n-1$, ta mở rộng sang 2 phía chừng nào các ký tự còn khớp nhau. Độ phức tạp thời gian đạt $O(n^2)$ và không tốn bộ nhớ phụ $O(1)$.',
      videoUrl: 'https://www.youtube.com/embed/sal78ACtGTc',
      languages: ['python', 'cpp', 'javascript'],
      starterCode: {
        python:
          'import sys\n\ndef longest_palindrome(s: str) -> str:\n    # Viết giải thuật mở rộng từ tâm ở đây\n    if not s:\n        return ""\n    res = ""\n    for i in range(len(s)):\n        # Tâm lẻ\n        l, r = i, i\n        while l >= 0 and r < len(s) and s[l] == s[r]:\n            if (r - l + 1) > len(res):\n                res = s[l:r+1]\n            l -= 1\n            r += 1\n        # Tâm chẵn\n        l, r = i, i + 1\n        while l >= 0 and r < len(s) and s[l] == s[r]:\n            if (r - l + 1) > len(res):\n                res = s[l:r+1]\n            l -= 1\n            r += 1\n    return res\n\nif __name__ == "__main__":\n    s = sys.stdin.read().strip()\n    print(longest_palindrome(s))\n',
        cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    if (cin >> s) {\n        // TODO: Tìm và in chuỗi con đối xứng dài nhất\n        cout << s << endl;\n    }\n    return 0;\n}\n',
      },
      testCases: {
        create: [
          { input: 'babad', expectedOutput: 'bab', isSample: true, sortOrder: 0 },
          { input: 'cbbd', expectedOutput: 'bb', isSample: true, sortOrder: 1 },
          { input: 'a', expectedOutput: 'a', isSample: true, sortOrder: 2 },
          { input: 'ac', expectedOutput: 'a', isSample: false, sortOrder: 3 },
          { input: 'racecar', expectedOutput: 'racecar', isSample: false, sortOrder: 4 },
        ],
      },
    },
  });

  // 3. Bài tập Code cơ bản có ÂM THANH & ĐOẠN VĂN
  await db.exercise.create({
    data: {
      type: 'CODE',
      title: 'Lập trình căn bản: Đảo ngược mảng số nguyên (Reverse Array)',
      isPublicPractice: true,
      category: 'Nhập môn Lập trình',
      difficulty: 'EASY',
      sortOrder: 30,
      statement:
        '### Đề bài\nCho một mảng gồm $N$ số nguyên. Hãy đảo ngược thứ tự các phần tử trong mảng và in ra màn hình các phần tử cách nhau bởi dấu cách.\n\n### Input\n- Dòng 1: Số nguyên $N$ ($1 \\le N \\le 1000$).\n- Dòng 2: $N$ số nguyên cách nhau bởi dấu cách.\n\n### Output\n- In ra mảng sau khi đảo ngược.',
      passage:
        'Gợi ý giải bài:\nBạn có thể sử dụng kỹ thuật 2 con trỏ `left = 0`, `right = n - 1` rồi hoán đổi hai phần tử `swap(arr[left], arr[right])`, sau đó tăng `left` và giảm `right` cho tới khi chúng gặp nhau.',
      audioUrl: 'https://cdn.freesound.org/previews/612/612080_5674468-lq.mp3',
      languages: ['python', 'cpp', 'javascript'],
      starterCode: {
        python:
          'import sys\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    arr = input_data[1:n+1]\n    arr.reverse()\n    print(" ".join(arr))\n\nif __name__ == "__main__":\n    main()\n',
        cpp: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    int n;\n    if (cin >> n) {\n        vector<int> a(n);\n        for (int i = 0; i < n; i++) cin >> a[i];\n        reverse(a.begin(), a.end());\n        for (int i = 0; i < n; i++) {\n            cout << a[i] << (i + 1 == n ? "" : " ");\n        }\n        cout << endl;\n    }\n    return 0;\n}\n',
      },
      testCases: {
        create: [
          { input: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1', isSample: true, sortOrder: 0 },
          { input: '3\n10 20 30', expectedOutput: '30 20 10', isSample: true, sortOrder: 1 },
          { input: '1\n99', expectedOutput: '99', isSample: false, sortOrder: 2 },
        ],
      },
    },
  });

  revalidatePath('/courses/practice');
  return { ok: true, data: { count: 3 } };
}

/**
 * Phân tích file Word (.docx), Markdown (.md, .mdx) hoặc văn bản thô thành cấu trúc đề bài
 */
export async function parseExerciseDocumentAction(formData: FormData) {
  await requireAdmin();
  const file = formData.get('file') as File | null;
  const rawText = formData.get('text') as string | null;

  if (!file && !rawText) {
    return {
      ok: false as const,
      error: 'Vui lòng tải lên file Word (.docx) / Markdown (.md, .mdx) hoặc dán văn bản đề bài.',
    };
  }

  let markdown = '';
  let fallbackTitle = 'Đề bài nhập từ tài liệu';

  try {
    if (file && file.size > 0) {
      fallbackTitle = file.name;
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!['.docx', '.md', '.markdown', '.mdx', '.txt'].includes(ext)) {
        return {
          ok: false as const,
          error: `Định dạng file "${ext}" không được hỗ trợ. Vui lòng sử dụng file Word (.docx) hoặc Markdown (.md, .mdx).`,
        };
      }

      if (ext === '.docx') {
        const buffer = Buffer.from(await file.arrayBuffer());
        const imported = await importDocx(buffer, saveImportedImage);
        markdown = imported.markdown;
        if (imported.title) fallbackTitle = imported.title;
      } else {
        markdown = await file.text();
      }
    } else if (rawText) {
      markdown = rawText;
    }

    if (!markdown.trim()) {
      return { ok: false as const, error: 'Tài liệu không có nội dung văn bản.' };
    }

    const parsed = parseExerciseDocument(markdown, fallbackTitle);
    return { ok: true as const, data: parsed };
  } catch (err: unknown) {
    console.error('[parseExerciseDocumentAction] Lỗi:', err);
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : 'Không thể phân tích tài liệu.',
    };
  }
}

/**
 * Lưu đề bài đã phân tích từ Word / MDX vào hệ thống
 */
export async function createExerciseFromDocumentAction(
  data: ParsedExerciseData,
  options: { isPublicPractice?: boolean; lessonId?: string } = { isPublicPractice: true },
) {
  await requireAdmin();

  const isQuiz = data.type === 'QUIZ';
  const count = await db.exercise.count({
    where: options.lessonId ? { lessonId: options.lessonId } : { isPublicPractice: true },
  });

  const exercise = await db.exercise.create({
    data: {
      lessonId: options.lessonId || null,
      title: data.title || (isQuiz ? 'Đề trắc nghiệm mới' : 'Bài tập lập trình mới'),
      type: data.type,
      statement: data.statement,
      passage: data.passage,
      audioUrl: data.audioUrl,
      videoUrl: data.videoUrl,
      imageUrl: data.imageUrl,
      category: data.category,
      difficulty: data.difficulty,
      isPublicPractice: options.isPublicPractice ?? true,
      sortOrder: (count + 1) * 10,
      questions: isQuiz ? (data.questions as unknown as Prisma.InputJsonValue) : [],
      languages: isQuiz ? [] : data.languages,
      starterCode: isQuiz ? {} : (data.starterCode as Prisma.InputJsonValue),
      testCases:
        !isQuiz && data.testCases.length > 0
          ? {
              create: data.testCases.map((tc, idx) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isSample: tc.isSample,
                sortOrder: idx,
              })),
            }
          : undefined,
    },
    select: { id: true, title: true, type: true },
  });

  revalidatePath('/courses/practice');
  revalidatePath('/admin/practice');
  revalidatePath(`/courses/practice/${exercise.id}`);
  if (options.lessonId) {
    revalidatePath('/admin/courses', 'layout');
  }

  return { ok: true as const, data: exercise };
}

export interface PracticeExerciseDetailForEdit {
  id: string;
  lessonId: string | null;
  title: string;
  type: 'CODE' | 'QUIZ';
  statement: string;
  passage: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  category: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isPublicPractice: boolean;
  languages: LanguageKey[];
  starterCode: Partial<Record<LanguageKey, string>>;
  timeLimitMs: number;
  memoryLimitMb: number;
  questions: QuizQuestion[];
  testCases: { id?: string; input: string; expectedOutput: string; isSample: boolean }[];
  courseTitle?: string | null;
  lessonTitle?: string | null;
}

/** Lấy chi tiết toàn bộ bài tập để soạn thảo, chỉnh sửa ngữ liệu và câu hỏi */
export async function getPracticeExerciseForEdit(
  id: string,
): Promise<PracticeExerciseDetailForEdit | null> {
  await requireAdmin();
  const exercise = await db.exercise.findUnique({
    where: { id },
    include: {
      testCases: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
      lesson: {
        select: {
          id: true,
          title: true,
          course: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!exercise) return null;

  const rawQuestions = Array.isArray(exercise.questions)
    ? (exercise.questions as unknown as QuizQuestion[])
    : [];

  return {
    id: exercise.id,
    lessonId: exercise.lessonId,
    title: exercise.title,
    type: exercise.type as 'CODE' | 'QUIZ',
    statement: exercise.statement,
    passage: exercise.passage,
    audioUrl: exercise.audioUrl,
    imageUrl: exercise.imageUrl,
    videoUrl: exercise.videoUrl,
    category: exercise.category,
    difficulty: (exercise.difficulty as 'EASY' | 'MEDIUM' | 'HARD') || 'MEDIUM',
    isPublicPractice: exercise.isPublicPractice,
    languages: exercise.languages.filter(isLanguageKey),
    starterCode: (exercise.starterCode ?? {}) as Partial<Record<LanguageKey, string>>,
    timeLimitMs: exercise.timeLimitMs,
    memoryLimitMb: exercise.memoryLimitMb,
    questions: rawQuestions,
    testCases: exercise.testCases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isSample: tc.isSample,
    })),
    courseTitle: exercise.lesson?.course.title,
    lessonTitle: exercise.lesson?.title,
  };
}

export interface BankQuestionItem {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  category: string | null;
  difficulty: string;
  type: QuizQuestionType;
  prompt: string;
  options?: QuizOption[];
  acceptableAnswers?: string[];
  explanation?: string;
}

/** Lấy ngân hàng toàn bộ câu hỏi trắc nghiệm từ các đề thi khác trong kho */
export async function getQuizQuestionBank(excludeExerciseId?: string): Promise<BankQuestionItem[]> {
  await requireAdmin();
  const exercises = await db.exercise.findMany({
    where: {
      AND: [
        excludeExerciseId ? { id: { not: excludeExerciseId } } : {},
        {
          OR: [{ type: 'QUIZ' }, { questions: { not: Prisma.JsonNull } }],
        },
      ],
    },
    select: {
      id: true,
      title: true,
      category: true,
      difficulty: true,
      questions: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const bank: BankQuestionItem[] = [];

  for (const ex of exercises) {
    if (!Array.isArray(ex.questions)) continue;
    const questions = ex.questions as unknown as QuizQuestion[];
    for (const q of questions) {
      if (!q.prompt?.trim()) continue;
      bank.push({
        id: q.id || `bank-${ex.id}-${Math.random().toString(36).slice(2, 6)}`,
        exerciseId: ex.id,
        exerciseTitle: ex.title,
        category: ex.category,
        difficulty: ex.difficulty,
        type: q.type || 'SINGLE',
        prompt: q.prompt,
        options: q.options,
        acceptableAnswers: q.acceptableAnswers,
        explanation: q.explanation,
      });
    }
  }

  return bank;
}

/** Admin: Xóa đề thi / bài tập khỏi kho */
export async function deletePracticeExercise(id: string) {
  await requireAdmin();
  const exercise = await db.exercise.delete({
    where: { id },
    select: { id: true, lessonId: true },
  });

  if (exercise.lessonId) {
    const lesson = await db.lesson.findUnique({
      where: { id: exercise.lessonId },
      select: { courseId: true },
    });
    if (lesson?.courseId) {
      revalidatePath('/admin/courses', 'layout');
    }
  }

  revalidatePath('/courses/practice');
  revalidatePath('/admin/practice');
  revalidatePath(`/courses/practice/${id}`);
  return { ok: true };
}

export interface BankMaterialItem {
  id: string;
  title: string;
  category: string | null;
  difficulty: string;
  passage: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  sourceExerciseTitle: string;
  createdAt: Date;
}

/** Lấy toàn bộ ngữ liệu (đoạn văn, audio, video, ảnh) có sẵn trong hệ thống */
export async function getLearningMaterialsBank(): Promise<BankMaterialItem[]> {
  await requireAdmin();
  const exercises = await db.exercise.findMany({
    where: {
      OR: [
        { passage: { not: null } },
        { audioUrl: { not: null } },
        { videoUrl: { not: null } },
        { imageUrl: { not: null } },
      ],
    },
    select: {
      id: true,
      title: true,
      category: true,
      difficulty: true,
      passage: true,
      audioUrl: true,
      videoUrl: true,
      imageUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return exercises
    .filter(
      (e) =>
        Boolean(e.passage?.trim()) ||
        Boolean(e.audioUrl?.trim()) ||
        Boolean(e.videoUrl?.trim()) ||
        Boolean(e.imageUrl?.trim()),
    )
    .map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      difficulty: e.difficulty,
      passage: e.passage,
      audioUrl: e.audioUrl,
      videoUrl: e.videoUrl,
      imageUrl: e.imageUrl,
      sourceExerciseTitle: e.title,
      createdAt: e.createdAt,
    }));
}

/** Tạo thêm một mục ngữ liệu mới lưu độc lập vào kho học liệu */
export async function createStandaloneMaterialAction(data: {
  title: string;
  category?: string;
  passage?: string;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
}) {
  await requireAdmin();
  if (!data.title?.trim()) {
    throw new Error('Vui lòng nhập tên ngữ liệu.');
  }

  const exercise = await db.exercise.create({
    data: {
      title: data.title.trim(),
      type: 'QUIZ',
      isPublicPractice: false,
      category: data.category?.trim() || 'Kho ngữ liệu',
      difficulty: 'MEDIUM',
      statement: '### Ngữ liệu dùng chung trong kho',
      passage: data.passage?.trim() || null,
      audioUrl: data.audioUrl?.trim() || null,
      videoUrl: data.videoUrl?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      questions: [],
    },
    select: { id: true, title: true },
  });

  revalidatePath('/admin/practice');
  return { ok: true, data: exercise };
}

/** Tạo thêm câu hỏi mới lưu độc lập vào ngân hàng câu hỏi */
export async function createStandaloneQuestionAction(data: {
  prompt: string;
  type?: QuizQuestionType;
  options?: QuizOption[];
  explanation?: string;
  category?: string;
}) {
  await requireAdmin();
  if (!data.prompt?.trim()) {
    throw new Error('Vui lòng nhập nội dung câu hỏi.');
  }

  const newQuestion: QuizQuestion = {
    id: `q-bank-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: data.type || 'SINGLE',
    prompt: data.prompt.trim(),
    options: data.options || [
      { id: 'opt-a', text: 'Lựa chọn A', isCorrect: true },
      { id: 'opt-b', text: 'Lựa chọn B', isCorrect: false },
    ],
    explanation: data.explanation?.trim() || '',
  };

  const exercise = await db.exercise.create({
    data: {
      title: `Câu hỏi ngân hàng: ${data.prompt.slice(0, 40)}...`,
      type: 'QUIZ',
      isPublicPractice: false,
      category: data.category?.trim() || 'Ngân hàng câu hỏi',
      difficulty: 'MEDIUM',
      statement: '### Câu hỏi lưu trong ngân hàng câu hỏi dùng chung',
      questions: [newQuestion as unknown as Prisma.InputJsonValue],
    },
    select: { id: true },
  });

  revalidatePath('/admin/practice');
  return { ok: true, data: { id: exercise.id, questionId: newQuestion.id } };
}

export interface PracticeExerciseCreateInput {
  title: string;
  type: 'CODE' | 'QUIZ';
  statement?: string;
  passage?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  category?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  isPublicPractice?: boolean;
  questions?: QuizQuestion[];
  languages?: LanguageKey[];
  starterCode?: Partial<Record<LanguageKey, string>>;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  testCases?: { input: string; expectedOutput: string; isSample: boolean }[];
}

/** Tạo đề thi mới từ form tạo đề (/admin/practice/new) */
export async function createPracticeExercise(
  input: PracticeExerciseCreateInput,
): Promise<{ ok: true; data: { id: string; title: string } }> {
  await requireAdmin();
  const isQuiz = input.type === 'QUIZ';
  const count = await db.exercise.count({ where: { isPublicPractice: true } });

  const exercise = await db.exercise.create({
    data: {
      title:
        input.title.trim() ||
        (isQuiz ? `Đề trắc nghiệm & Ngữ liệu #${count + 1}` : `Bài tập Lập trình #${count + 1}`),
      type: input.type,
      statement: input.statement || (isQuiz ? '### Hướng dẫn làm bài' : '### Đề bài'),
      passage: input.passage?.trim() || null,
      audioUrl: input.audioUrl?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      category:
        input.category?.trim() || (isQuiz ? 'Đọc hiểu & Nghe hiểu' : 'Thuật toán & Lập trình'),
      difficulty: input.difficulty || 'MEDIUM',
      isPublicPractice: input.isPublicPractice ?? true,
      sortOrder: (count + 1) * 10,
      questions: isQuiz ? (input.questions as unknown as Prisma.InputJsonValue) || [] : [],
      languages: isQuiz ? [] : input.languages || ['python', 'cpp', 'javascript'],
      starterCode: isQuiz ? {} : (input.starterCode as unknown as Prisma.InputJsonValue) || {},
      timeLimitMs: input.timeLimitMs || 2000,
      memoryLimitMb: input.memoryLimitMb || 256,
      testCases:
        !isQuiz && input.testCases && input.testCases.length > 0
          ? {
              create: input.testCases.map((tc, idx) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isSample: tc.isSample,
                sortOrder: idx,
              })),
            }
          : undefined,
    },
    select: { id: true, title: true },
  });

  revalidatePath('/courses/practice');
  revalidatePath('/admin/practice');
  revalidatePath(`/courses/practice/${exercise.id}`);
  return { ok: true as const, data: exercise };
}
