import { describe, it, expect } from 'vitest';
import { gradeQuiz, sanitizeQuestionsForStudent, type QuizQuestion } from '@/lib/courses/quiz';

describe('Quiz Evaluation & Sanitization Tests', () => {
  const sampleQuestions: QuizQuestion[] = [
    {
      id: 'q1',
      type: 'SINGLE',
      prompt: 'Where is the conference being held?',
      options: [
        { id: 'opt-a', text: 'In room 101', isCorrect: false },
        { id: 'opt-b', text: 'In the main auditorium', isCorrect: true },
        { id: 'opt-c', text: 'At the hotel', isCorrect: false },
      ],
      explanation: 'The announcement clearly states the main auditorium.',
    },
    {
      id: 'q2',
      type: 'MULTIPLE',
      prompt: 'Which items are required for the exam? (Choose 2)',
      options: [
        { id: 'opt-id', text: 'Student ID card', isCorrect: true },
        { id: 'opt-pen', text: 'Black pen', isCorrect: true },
        { id: 'opt-phone', text: 'Mobile phone', isCorrect: false },
      ],
      explanation: 'Students must bring their ID and pen. Phones are prohibited.',
    },
    {
      id: 'q3',
      type: 'FILL_BLANK',
      prompt: 'The manager asked everyone to submit their report by ______ afternoon.',
      acceptableAnswers: ['Friday', 'friday'],
      explanation: 'The email says Friday afternoon.',
    },
  ];

  it('sanitizeQuestionsForStudent không tiết lộ đáp án đúng hay giải thích cho học viên', () => {
    const studentData = sanitizeQuestionsForStudent(sampleQuestions);
    expect(studentData).toHaveLength(3);

    // Q1
    expect(studentData[0]?.prompt).toBe('Where is the conference being held?');
    expect(studentData[0]?.options).toEqual([
      { id: 'opt-a', text: 'In room 101' },
      { id: 'opt-b', text: 'In the main auditorium' },
      { id: 'opt-c', text: 'At the hotel' },
    ]);
    expect(studentData[0]).not.toHaveProperty('explanation');
    expect(studentData[0]?.options?.[1]).not.toHaveProperty('isCorrect');

    // Q3
    expect(studentData[2]).not.toHaveProperty('acceptableAnswers');
    expect(studentData[2]).not.toHaveProperty('explanation');
  });

  it('gradeQuiz chấm chính xác câu hỏi SINGLE choice', () => {
    // Trả lời đúng Q1
    const resCorrect = gradeQuiz(sampleQuestions, {
      q1: 'opt-b',
      q2: ['opt-id', 'opt-pen'],
      q3: 'Friday',
    });
    expect(resCorrect.details[0]?.isCorrect).toBe(true);

    // Trả lời sai Q1
    const resWrong = gradeQuiz(sampleQuestions, {
      q1: 'opt-a',
      q2: ['opt-id', 'opt-pen'],
      q3: 'Friday',
    });
    expect(resWrong.details[0]?.isCorrect).toBe(false);
  });

  it('gradeQuiz chấm chính xác câu hỏi MULTIPLE choice', () => {
    // Chọn đúng và đủ cả 2 phương án
    const resCorrect = gradeQuiz([sampleQuestions[1]!], { q2: ['opt-id', 'opt-pen'] });
    expect(resCorrect.score).toBe(1);
    expect(resCorrect.details[0]?.isCorrect).toBe(true);

    // Chọn thiếu 1 phương án
    const resPartial = gradeQuiz([sampleQuestions[1]!], { q2: ['opt-id'] });
    expect(resPartial.score).toBe(0);
    expect(resPartial.details[0]?.isCorrect).toBe(false);

    // Chọn thừa phương án sai
    const resExcess = gradeQuiz([sampleQuestions[1]!], { q2: ['opt-id', 'opt-pen', 'opt-phone'] });
    expect(resExcess.score).toBe(0);
    expect(resExcess.details[0]?.isCorrect).toBe(false);
  });

  it('gradeQuiz chấm chính xác FILL_BLANK không phân biệt hoa thường và khoảng trắng', () => {
    const res1 = gradeQuiz([sampleQuestions[2]!], { q3: 'friday' });
    expect(res1.score).toBe(1);

    const res2 = gradeQuiz([sampleQuestions[2]!], { q3: '  FRIDAY  ' });
    expect(res2.score).toBe(1);

    const res3 = gradeQuiz([sampleQuestions[2]!], { q3: 'Thursday' });
    expect(res3.score).toBe(0);
  });

  it('gradeQuiz tính toán chính xác tỷ lệ phần trăm và trạng thái hoàn thành passed', () => {
    // 3/3 câu đúng -> 100% -> passed: true
    const allRight = gradeQuiz(sampleQuestions, {
      q1: 'opt-b',
      q2: ['opt-id', 'opt-pen'],
      q3: 'friday',
    });
    expect(allRight.score).toBe(3);
    expect(allRight.total).toBe(3);
    expect(allRight.percent).toBe(100);
    expect(allRight.passed).toBe(true);

    // 1/3 câu đúng -> 33% -> passed: false
    const oneRight = gradeQuiz(sampleQuestions, {
      q1: 'opt-b',
      q2: ['opt-phone'],
      q3: 'wrong answer',
    });
    expect(oneRight.score).toBe(1);
    expect(oneRight.percent).toBe(33);
    expect(oneRight.passed).toBe(false);
  });
});
