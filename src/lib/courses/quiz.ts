/**
 * Module quản lý cấu trúc câu hỏi và chấm điểm bài tập Trắc nghiệm / Điền từ (TOEIC, TOPIK, v.v.)
 */

export type QuizQuestionType = 'SINGLE' | 'MULTIPLE' | 'FILL_BLANK';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options?: QuizOption[];
  acceptableAnswers?: string[];
  explanation?: string;
}

/** Cấu trúc câu hỏi an toàn gửi cho học viên (đã loại bỏ đáp án và lời giải thích) */
export interface StudentQuizOption {
  id: string;
  text: string;
}

export interface StudentQuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options?: StudentQuizOption[];
}

/** Kết quả chi tiết của từng câu hỏi sau khi chấm */
export interface QuestionGradeDetail {
  questionId: string;
  isCorrect: boolean;
  studentAnswer: string | string[];
  correctAnswerText: string;
  explanation?: string;
}

export interface QuizGradeResult {
  score: number;
  total: number;
  passed: boolean; // Đạt nếu trả lời đúng toàn bộ hoặc >= 80%
  percent: number;
  details: QuestionGradeDetail[];
}

/**
 * Loại bỏ đáp án đúng và lời giải thích trước khi gửi về client học viên
 * nhằm chống gian lận (Inspect Network / DOM).
 */
export function sanitizeQuestionsForStudent(questions: unknown): StudentQuizQuestion[] {
  if (!Array.isArray(questions)) return [];

  return questions.map((itemUnknown) => {
    const q = (
      typeof itemUnknown === 'object' && itemUnknown !== null ? itemUnknown : {}
    ) as Record<string, unknown>;
    const rawType = String(q.type || '');
    const item: StudentQuizQuestion = {
      id: String(q.id || ''),
      type: (['SINGLE', 'MULTIPLE', 'FILL_BLANK'].includes(rawType)
        ? rawType
        : 'SINGLE') as QuizQuestionType,
      prompt: String(q.prompt || ''),
    };

    if (item.type !== 'FILL_BLANK' && Array.isArray(q.options)) {
      item.options = q.options.map((optUnknown) => {
        const opt = (
          typeof optUnknown === 'object' && optUnknown !== null ? optUnknown : {}
        ) as Record<string, unknown>;
        return {
          id: String(opt.id || ''),
          text: String(opt.text || ''),
        };
      });
    }

    return item;
  });
}

/**
 * Chuẩn hóa chuỗi để so sánh đáp án điền từ (bỏ khoảng trắng thừa, đưa về chữ thường)
 */
export function normalizeTextAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Chấm điểm bài tập Trắc nghiệm & Điền từ
 */
export function gradeQuiz(
  questions: QuizQuestion[],
  studentAnswers: Record<string, string | string[]>,
): QuizGradeResult {
  const details: QuestionGradeDetail[] = [];
  let score = 0;

  for (const q of questions) {
    const rawAnswer = studentAnswers[q.id];
    let isCorrect = false;
    let correctAnswerText = '';

    if (q.type === 'SINGLE') {
      const correctOpt = q.options?.find((opt) => opt.isCorrect);
      correctAnswerText = correctOpt ? correctOpt.text : '';
      const selectedId = typeof rawAnswer === 'string' ? rawAnswer : '';
      isCorrect = Boolean(correctOpt && selectedId === correctOpt.id);
    } else if (q.type === 'MULTIPLE') {
      const correctOptIds = new Set(
        (q.options || []).filter((opt) => opt.isCorrect).map((opt) => opt.id),
      );
      const studentOptIds = new Set(
        Array.isArray(rawAnswer)
          ? rawAnswer
          : typeof rawAnswer === 'string' && rawAnswer
            ? [rawAnswer]
            : [],
      );

      correctAnswerText = (q.options || [])
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.text)
        .join(', ');

      if (correctOptIds.size > 0 && correctOptIds.size === studentOptIds.size) {
        isCorrect = Array.from(correctOptIds).every((id) => studentOptIds.has(id));
      }
    } else if (q.type === 'FILL_BLANK') {
      const studentInput = typeof rawAnswer === 'string' ? rawAnswer : '';
      const normStudent = normalizeTextAnswer(studentInput);
      const acceptable = (q.acceptableAnswers || []).map(normalizeTextAnswer);

      correctAnswerText = (q.acceptableAnswers || []).join(' / ');
      isCorrect = Boolean(normStudent && acceptable.includes(normStudent));
    }

    if (isCorrect) {
      score += 1;
    }

    details.push({
      questionId: q.id,
      isCorrect,
      studentAnswer: rawAnswer ?? '',
      correctAnswerText,
      explanation: q.explanation || '',
    });
  }

  const total = questions.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  // Đạt khi đúng 100% (hoặc bài có trên 4 câu thì đúng >= 80%)
  const passed = total > 0 && (total <= 3 ? score === total : percent >= 80);

  return {
    score,
    total,
    passed,
    percent,
    details,
  };
}
