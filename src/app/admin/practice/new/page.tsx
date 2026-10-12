import type { Metadata } from 'next';
import {
  getQuizQuestionBank,
  getLearningMaterialsBank,
  type PracticeExerciseDetailForEdit,
} from '@/server/actions/practice';
import { PracticeExerciseEditor } from '@/components/admin/practice/practice-exercise-editor';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tạo Đề Thi Mới - Kho Luyện Đề Admin',
};

export default async function AdminPracticeNewPage() {
  const [bankQuestions, materials] = await Promise.all([
    getQuizQuestionBank(),
    getLearningMaterialsBank(),
  ]);

  const initialNewExercise: PracticeExerciseDetailForEdit = {
    id: 'new',
    lessonId: null,
    title: '',
    type: 'QUIZ',
    statement:
      '### Hướng dẫn làm bài\nĐọc kỹ đoạn văn hoặc lắng nghe ngữ liệu âm thanh đính kèm để trả lời các câu hỏi.',
    passage: null,
    audioUrl: null,
    imageUrl: null,
    videoUrl: null,
    category: 'Đọc hiểu & Nghe hiểu',
    difficulty: 'MEDIUM',
    isPublicPractice: true,
    languages: ['python', 'cpp', 'javascript'],
    starterCode: {
      python: 'def solve():\n    pass\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
    },
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    questions: [
      {
        id: `q-init-1`,
        type: 'SINGLE',
        prompt: 'Câu hỏi 1: ',
        options: [
          { id: 'opt-a', text: 'Phương án A', isCorrect: true },
          { id: 'opt-b', text: 'Phương án B', isCorrect: false },
          { id: 'opt-c', text: 'Phương án C', isCorrect: false },
          { id: 'opt-d', text: 'Phương án D', isCorrect: false },
        ],
        explanation: '',
      },
    ],
    testCases: [],
  };

  return (
    <PracticeExerciseEditor
      initial={initialNewExercise}
      bankQuestions={bankQuestions}
      materials={materials}
      isNew={true}
    />
  );
}
