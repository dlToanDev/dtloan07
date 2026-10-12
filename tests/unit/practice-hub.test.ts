import { describe, it, expect } from 'vitest';

describe('Kho Luyện Đề & Học Liệu Đa Phương Tiện (Practice Hub & Multimedia Materials)', () => {
  interface PracticeItem {
    id: string;
    title: string;
    type: 'CODE' | 'QUIZ';
    category: string | null;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    isPublicPractice: boolean;
    passage?: string | null;
    audioUrl?: string | null;
    videoUrl?: string | null;
    imageUrl?: string | null;
  }

  const sampleBank: PracticeItem[] = [
    {
      id: 'ex-1',
      title: 'Hai con trỏ - Two Sum',
      type: 'CODE',
      category: 'Thuật toán & Cấu trúc dữ liệu',
      difficulty: 'EASY',
      isPublicPractice: true,
      videoUrl: 'https://www.youtube.com/watch?v=KLlXCFG5TnA',
      passage: 'Mô tả bài toán hai con trỏ tối ưu O(N)...',
    },
    {
      id: 'ex-2',
      title: 'IELTS Listening Section 1: Hotel Reservation',
      type: 'QUIZ',
      category: 'Tiếng Anh & Ngoại ngữ',
      difficulty: 'MEDIUM',
      isPublicPractice: true,
      audioUrl: 'https://example.com/audio/ielts-test-1.mp3',
      passage: 'Listen to the conversation between a receptionist and a guest.',
    },
    {
      id: 'ex-3',
      title: 'Đọc hiểu kỹ thuật: CI/CD Microservices',
      type: 'QUIZ',
      category: 'DevOps & System Architecture',
      difficulty: 'HARD',
      isPublicPractice: true,
      passage: 'Continuous Integration and Deployment in containerized environments...',
      imageUrl: 'https://example.com/images/k8s-flow.png',
    },
    {
      id: 'ex-4',
      title: 'Thuật toán đồ thị Dijkstra (Khóa học nâng cao)',
      type: 'CODE',
      category: 'Thuật toán nâng cao',
      difficulty: 'HARD',
      isPublicPractice: false, // Không công khai trên kho luyện đề
    },
  ];

  it('1. Chỉ cho phép các bài isPublicPractice: true xuất hiện trên trang Luyện đề', () => {
    const publicExercises = sampleBank.filter((e) => e.isPublicPractice);
    expect(publicExercises).toHaveLength(3);
    expect(publicExercises.map((e) => e.id)).not.toContain('ex-4');
  });

  it('2. Lọc chính xác theo loại bài (CODE hoặc QUIZ)', () => {
    const codeExercises = sampleBank.filter((e) => e.isPublicPractice && e.type === 'CODE');
    expect(codeExercises).toHaveLength(1);
    expect(codeExercises[0]!.id).toBe('ex-1');

    const quizExercises = sampleBank.filter((e) => e.isPublicPractice && e.type === 'QUIZ');
    expect(quizExercises).toHaveLength(2);
    expect(quizExercises.map((e) => e.id)).toEqual(['ex-2', 'ex-3']);
  });

  it('3. Lọc theo kho học liệu đa phương tiện (AUDIO, VIDEO, PASSAGE)', () => {
    const audioExercises = sampleBank.filter(
      (e) => e.isPublicPractice && Boolean(e.audioUrl?.trim()),
    );
    expect(audioExercises).toHaveLength(1);
    expect(audioExercises[0]!.id).toBe('ex-2');

    const videoExercises = sampleBank.filter(
      (e) => e.isPublicPractice && Boolean(e.videoUrl?.trim()),
    );
    expect(videoExercises).toHaveLength(1);
    expect(videoExercises[0]!.id).toBe('ex-1');

    const passageExercises = sampleBank.filter(
      (e) => e.isPublicPractice && Boolean(e.passage?.trim()),
    );
    expect(passageExercises).toHaveLength(3);
  });

  it('4. Kiểm tra phân quyền truy cập miễn phí cho Khách (Guest Access)', () => {
    function canAccessExercise(
      exercise: { isPublicPractice: boolean },
      isEnrolled: boolean,
      isAdmin: boolean,
    ) {
      if (exercise.isPublicPractice) return true; // Miễn phí cho tất cả mọi người
      if (isAdmin) return true;
      return isEnrolled;
    }

    // Guest chưa đăng nhập, chưa mua khóa:
    expect(canAccessExercise({ isPublicPractice: true }, false, false)).toBe(true);

    // Bài tập trong khóa đóng phí:
    expect(canAccessExercise({ isPublicPractice: false }, false, false)).toBe(false);
    expect(canAccessExercise({ isPublicPractice: false }, true, false)).toBe(true);
    expect(canAccessExercise({ isPublicPractice: false }, false, true)).toBe(true);
  });

  it('5. Trích xuất đúng YouTube Video ID từ nhiều định dạng URL khác nhau', () => {
    function extractYoutubeId(url: string | null | undefined): string | null {
      if (!url) return null;
      const match = url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
      );
      return match?.[1] ?? null;
    }

    expect(extractYoutubeId('https://www.youtube.com/watch?v=KLlXCFG5TnA')).toBe('KLlXCFG5TnA');
    expect(extractYoutubeId('https://youtu.be/KLlXCFG5TnA')).toBe('KLlXCFG5TnA');
    expect(extractYoutubeId('https://www.youtube.com/embed/KLlXCFG5TnA')).toBe('KLlXCFG5TnA');
    expect(extractYoutubeId('https://example.com/video.mp4')).toBeNull();
  });

  it('6. Tổng hợp ngân hàng câu hỏi từ các đề thi khác nhau (Question Bank Aggregation)', () => {
    const mockExercises = [
      {
        id: 'ex-a',
        title: 'Đề thi tiếng Anh A1',
        category: 'Tiếng Anh',
        questions: [
          {
            id: 'q-1',
            prompt: 'What is your name?',
            options: [{ id: 'opt-1', text: 'Toan', isCorrect: true }],
          },
          {
            id: 'q-2',
            prompt: 'Where do you live?',
            options: [{ id: 'opt-2', text: 'Hanoi', isCorrect: true }],
          },
        ],
      },
      {
        id: 'ex-b',
        title: 'Đề thi tiếng Anh B2',
        category: 'Tiếng Anh',
        questions: [
          {
            id: 'q-3',
            prompt: 'Choose the correct preposition: interested ___ music',
            options: [{ id: 'opt-3', text: 'in', isCorrect: true }],
          },
        ],
      },
    ];

    // Ngân hàng câu hỏi thu thập từ các đề khác:
    const bank = mockExercises.flatMap((ex) =>
      ex.questions.map((q) => ({
        ...q,
        exerciseId: ex.id,
        exerciseTitle: ex.title,
      })),
    );

    expect(bank).toHaveLength(3);
    expect(bank[0]!.prompt).toBe('What is your name?');
    expect(bank[2]!.exerciseTitle).toBe('Đề thi tiếng Anh B2');

    // Tìm kiếm trong ngân hàng câu hỏi
    const searchKeyword = 'preposition';
    const matched = bank.filter((q) => q.prompt.toLowerCase().includes(searchKeyword));
    expect(matched).toHaveLength(1);
    expect(matched[0]!.id).toBe('q-3');
  });

  it('7. Nhân bản câu hỏi từ kho vào đề mới sinh ID duy nhất không bị trùng lặp', () => {
    const originalQuestion = {
      id: 'q-source',
      type: 'SINGLE' as const,
      prompt: 'Câu hỏi mẫu',
      options: [
        { id: 'opt-1', text: 'Đáp án A', isCorrect: true },
        { id: 'opt-2', text: 'Đáp án B', isCorrect: false },
      ],
      explanation: 'Giải thích mẫu',
    };

    const cloned = {
      ...originalQuestion,
      id: `q-${Date.now()}-abc`,
      options: originalQuestion.options.map((opt, i) => ({
        ...opt,
        id: `opt-${i}-cloned`,
      })),
    };

    expect(cloned.id).not.toBe(originalQuestion.id);
    expect(cloned.options[0]!.id).not.toBe(originalQuestion.options[0]!.id);
    expect(cloned.options[0]!.text).toBe('Đáp án A');
    expect(cloned.options[0]!.isCorrect).toBe(true);
  });
});
