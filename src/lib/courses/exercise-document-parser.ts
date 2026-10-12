import matter from 'gray-matter';
import type { QuizQuestion, QuizOption, QuizQuestionType } from '@/lib/courses/quiz';
import type { LanguageKey } from '@/lib/judge/languages';

export interface ParsedExerciseData {
  title: string;
  type: 'QUIZ' | 'CODE';
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statement: string;
  passage?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  questions: QuizQuestion[];
  languages: LanguageKey[];
  starterCode: Partial<Record<LanguageKey, string>>;
  testCases: { input: string; expectedOutput: string; isSample: boolean }[];
}

/** Chuẩn hóa độ khó */
function parseDifficulty(raw: string | undefined): 'EASY' | 'MEDIUM' | 'HARD' {
  if (!raw) return 'MEDIUM';
  const val = raw.toUpperCase().trim();
  if (val.includes('EASY') || val.includes('DỄ') || val.includes('DE')) return 'EASY';
  if (
    val.includes('HARD') ||
    val.includes('KHÓ') ||
    val.includes('KHO') ||
    val.includes('NÂNG CAO')
  )
    return 'HARD';
  return 'MEDIUM';
}

/** Tách các test case cho bài Code từ markdown */
function extractTestCases(markdown: string) {
  const testCases: { input: string; expectedOutput: string; isSample: boolean }[] = [];

  // Mẫu: ### Test case 1 (Mẫu) \n Input: ... \n Output: ...
  const testRegex =
    /(?:###?\s*(?:Test(?:\s*case)?|Ví dụ|Example)\s*(\d+)?(?:\s*\(([^)]+)\))?[\s\S]*?)(?:Input|Đầu vào)\s*[:\n]\s*```?(?:[a-zA-Z]*\n)?([\s\S]*?)```?\s*(?:Output|Đầu ra|Kết quả)\s*[:\n]\s*```?(?:[a-zA-Z]*\n)?([\s\S]*?)```?(?=\n###?|\n\n---\n|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = testRegex.exec(markdown)) !== null) {
    const isSampleFlag = Boolean(match[2] && /mẫu|sample|ví dụ|example/i.test(match[2]));
    const input = (match[3] || '').trim();
    const expectedOutput = (match[4] || '').trim();
    if (input || expectedOutput) {
      testCases.push({
        input,
        expectedOutput,
        isSample: isSampleFlag || testCases.length < 2,
      });
    }
  }

  // Fallback nếu người dùng viết đơn giản:
  // Input: 1 2
  // Output: 3
  if (testCases.length === 0) {
    const simpleRegex =
      /(?:Input|Đầu vào):\s*`?([^\n`]+)`?\s*\n(?:Output|Đầu ra):\s*`?([^\n`]+)`?/gi;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = simpleRegex.exec(markdown)) !== null) {
      const input = (sMatch[1] || '').trim();
      const expectedOutput = (sMatch[2] || '').trim();
      if (input || expectedOutput) {
        testCases.push({
          input,
          expectedOutput,
          isSample: testCases.length < 2,
        });
      }
    }
  }

  return testCases;
}

/** Trích xuất code khởi tạo theo từng ngôn ngữ */
function extractStarterCode(markdown: string): Partial<Record<LanguageKey, string>> {
  const starterCode: Partial<Record<LanguageKey, string>> = {};
  const codeBlockRegex = /```(python|py|cpp|c\+\+|javascript|js|java)\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const rawLang = match[1]!.toLowerCase();
    const code = match[2]!.trim();
    if (rawLang === 'python' || rawLang === 'py') starterCode.python = code;
    else if (rawLang === 'cpp' || rawLang === 'c++') starterCode.cpp = code;
    else if (rawLang === 'javascript' || rawLang === 'js') starterCode.javascript = code;
    else if (rawLang === 'java') starterCode.java = code;
  }

  return starterCode;
}

/**
 * Phân tích các câu hỏi trắc nghiệm từ văn bản
 */
export function extractQuizQuestions(text: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  // Tách từng câu hỏi bắt đầu bằng "Câu 1", "Question 1", "1.", "### Câu 1"
  const questionBlocks = text.split(
    /(?:^|\n)(?=(?:###?\s*)?(?:Câu|Question|Bài)\s*\d+[\s.:\-–—]|\d+\.\s+[A-ZÀ-Ỹ])/i,
  );

  for (const rawBlock of questionBlocks) {
    const block = rawBlock.trim();
    if (!block) continue;

    // Kiểm tra xem block có chứa câu hỏi không
    const headerMatch = block.match(
      /^(?:###?\s*)?(?:(?:Câu|Question|Bài)\s*(\d+)[\s.:\-–—]|\d+\.)\s*([\s\S]*?)(?=\n\s*(?:[A-D][).]|\[[ xX]\]|\*\s*[A-D][).]))/i,
    );
    if (!headerMatch) continue;

    const prompt = headerMatch[2]!.trim();
    const restOfBlock = block.slice(headerMatch[0].length);

    // Tìm đáp án đúng được chỉ định riêng dạng "Đáp án: A" hoặc "Đáp án: A, B"
    const explicitAnswerMatch = restOfBlock.match(
      /(?:Đáp án|Key|Answer)\s*[:=]\s*([A-D](?:\s*[,;&]\s*[A-D])*)/i,
    );
    const explicitAnswers = explicitAnswerMatch
      ? explicitAnswerMatch[1]!
          .toUpperCase()
          .split(/[,;&\s]+/)
          .filter(Boolean)
      : [];

    // Tìm lời giải thích
    const explanationMatch = restOfBlock.match(
      /(?:Giải thích|Lời giải|Explanation)\s*[:=]\s*([\s\S]*?)(?=(?:\n(?:[A-D][).]|Câu|Question)|\n\n---\n|$))/i,
    );
    const explanation = explanationMatch ? explanationMatch[1]!.trim() : undefined;

    // Trích xuất các phương án lựa chọn A, B, C, D
    const optionLines = restOfBlock.split('\n');
    const options: QuizOption[] = [];
    let currentOpt: { id: string; letter: string; text: string; isCorrect: boolean } | null = null;

    const optRegex = /^\s*(?:(\*)\s*)?(?:\[([ xX])\]\s*)?([A-D])[).:]\s*(.*?)(?:\s*(\*))?$/i;

    for (const line of optionLines) {
      // Bỏ qua dòng Đáp án hoặc Giải thích
      if (/^\s*(?:Đáp án|Key|Answer|Giải thích|Lời giải|Explanation)\s*[:=]/i.test(line)) {
        continue;
      }

      const matchOpt = line.match(optRegex);
      if (matchOpt) {
        if (currentOpt) {
          options.push({
            id: currentOpt.id,
            text: currentOpt.text.trim(),
            isCorrect: currentOpt.isCorrect,
          });
        }
        const hasAsterisk = Boolean(matchOpt[1] || matchOpt[5]);
        const hasCheckbox = matchOpt[2]?.toLowerCase() === 'x';
        const letter = matchOpt[3]!.toUpperCase();
        const text = matchOpt[4]!.trim();
        const isCorrectByExplicit = explicitAnswers.includes(letter);

        currentOpt = {
          id: `opt-${letter.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          letter,
          text,
          isCorrect: hasAsterisk || hasCheckbox || isCorrectByExplicit,
        };
      } else if (currentOpt && line.trim()) {
        // Dòng tiếp theo của phương án trước
        currentOpt.text += ' ' + line.trim();
      }
    }

    if (currentOpt) {
      options.push({
        id: currentOpt.id,
        text: currentOpt.text.trim(),
        isCorrect: currentOpt.isCorrect,
      });
    }

    if (options.length >= 2) {
      const correctCount = options.filter((o) => o.isCorrect).length;
      const type: QuizQuestionType = correctCount > 1 ? 'MULTIPLE' : 'SINGLE';

      // Nếu không có câu nào được đánh dấu đúng, mặc định câu đầu tiên là đúng
      if (correctCount === 0 && options[0]) {
        options[0].isCorrect = true;
      }

      questions.push({
        id: `q-${questions.length + 1}-${Date.now().toString(36)}`,
        type,
        prompt,
        options,
        explanation,
      });
    }
  }

  return questions;
}

/**
 * Phân tích nội dung Markdown / MDX / trích xuất từ Word thành cấu trúc đề bài hoàn chỉnh
 */
export function parseExerciseDocument(
  rawText: string,
  fallbackTitle: string = 'Đề bài mới',
): ParsedExerciseData {
  // 1. Phân tích Frontmatter (nếu có)
  const matterParsed = matter(rawText.replace(/^﻿/, '').trim());
  const frontData = matterParsed.data || {};
  let content = matterParsed.content.trim();

  // 2. Trích xuất metadata từ frontmatter hoặc các dòng chú thích trên đầu
  let title = (frontData.title as string) || '';
  let category = (frontData.category as string) || '';
  let difficultyRaw = (frontData.difficulty as string) || '';
  let typeRaw = (frontData.type as string)?.toUpperCase() || '';
  let audioUrl = (frontData.audioUrl as string) || (frontData.audio as string) || null;
  let videoUrl = (frontData.videoUrl as string) || (frontData.video as string) || null;
  let imageUrl = (frontData.imageUrl as string) || (frontData.image as string) || null;
  let passage = (frontData.passage as string) || null;

  // Trích xuất metadata từ đầu văn bản nếu chưa có trong frontmatter
  const lines = content.split('\n');
  const remainingLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (i < 15) {
      if (!title && /^#\s+(.+)$/.test(line)) {
        title = line.replace(/^#\s+/, '').trim();
        continue;
      }
      if (!title && /^(?:Tiêu đề|Title|Tên bài)\s*[:=]\s*(.+)$/i.test(line)) {
        title = line.replace(/^(?:Tiêu đề|Title|Tên bài)\s*[:=]\s*/i, '').trim();
        continue;
      }
      if (!category && /^(?:Chủ đề|Thể loại|Category|Môn học)\s*[:=]\s*(.+)$/i.test(line)) {
        category = line.replace(/^(?:Chủ đề|Thể loại|Category|Môn học)\s*[:=]\s*/i, '').trim();
        continue;
      }
      if (!difficultyRaw && /^(?:Độ khó|Mức độ|Difficulty)\s*[:=]\s*(.+)$/i.test(line)) {
        difficultyRaw = line.replace(/^(?:Độ khó|Mức độ|Difficulty)\s*[:=]\s*/i, '').trim();
        continue;
      }
      if (!typeRaw && /^(?:Loại|Dạng bài|Type)\s*[:=]\s*(.+)$/i.test(line)) {
        typeRaw = line
          .replace(/^(?:Loại|Dạng bài|Type)\s*[:=]\s*/i, '')
          .toUpperCase()
          .trim();
        continue;
      }
      if (!audioUrl && /^(?:Audio|Âm thanh)\s*[:=]\s*(https?:\/\/[^\s]+)$/i.test(line)) {
        audioUrl = line.replace(/^(?:Audio|Âm thanh)\s*[:=]\s*/i, '').trim();
        continue;
      }
      if (!videoUrl && /^(?:Video|Clip)\s*[:=]\s*(https?:\/\/[^\s]+)$/i.test(line)) {
        videoUrl = line.replace(/^(?:Video|Clip)\s*[:=]\s*/i, '').trim();
        continue;
      }
      if (!imageUrl && /^(?:Image|Ảnh|Hình ảnh)\s*[:=]\s*(https?:\/\/[^\s]+)$/i.test(line)) {
        imageUrl = line.replace(/^(?:Image|Ảnh|Hình ảnh)\s*[:=]\s*/i, '').trim();
        continue;
      }
    }
    remainingLines.push(lines[i]!);
  }

  content = remainingLines.join('\n').trim();

  // 3. Trích xuất Đoạn văn / Ngữ liệu (Passage)
  if (!passage) {
    const passageMatch = content.match(
      /(?:\[(?:Đoạn văn(?: đọc hiểu)?|Ngữ liệu|Passage)\]|###?\s*(?:Đoạn văn(?: đọc hiểu)?|Ngữ liệu|Passage))\s*\n([\s\S]*?)(?=(?:\n(?:###?\s*)?(?:Câu hỏi|Câu\s*\d+|Question\s*\d+|Bài\s*\d+|Test case|Đề bài|Hướng dẫn)|$))/i,
    );
    if (passageMatch) {
      passage = passageMatch[1]!.trim();
      // Loại bỏ khối passage ra khỏi nội dung câu hỏi/đề bài
      content = content.replace(passageMatch[0], '').trim();
    }
  }

  // Trích xuất hình ảnh đầu tiên trong markdown nếu chưa có imageUrl
  if (!imageUrl) {
    const imgMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    if (imgMatch) {
      imageUrl = imgMatch[1]!;
    }
  }

  // 4. Trích xuất câu hỏi trắc nghiệm
  const questions = extractQuizQuestions(content);

  // 5. Trích xuất Code và Test cases
  const starterCode = extractStarterCode(content);
  const testCases = extractTestCases(content);

  // 6. Tự động nhận diện loại đề (QUIZ hay CODE)
  let detectedType: 'QUIZ' | 'CODE' = 'QUIZ';
  if (typeRaw.includes('CODE') || typeRaw.includes('LẬP TRÌNH') || typeRaw.includes('LAP TRINH')) {
    detectedType = 'CODE';
  } else if (
    typeRaw.includes('QUIZ') ||
    typeRaw.includes('TRẮC NGHIỆM') ||
    typeRaw.includes('TRAC NGHIEM')
  ) {
    detectedType = 'QUIZ';
  } else {
    // Nếu có >= 1 câu hỏi trắc nghiệm -> QUIZ
    // Nếu có test case hoặc starter code -> CODE
    if (questions.length > 0) {
      detectedType = 'QUIZ';
    } else if (testCases.length > 0 || Object.keys(starterCode).length > 0) {
      detectedType = 'CODE';
    } else {
      detectedType = 'QUIZ';
    }
  }

  // Làm sạch đề bài (statement)
  let statement = content;
  if (detectedType === 'QUIZ' && questions.length > 0) {
    // Với QUIZ, nếu đề bài dài thì lấy phần trước câu 1 làm hướng dẫn, hoặc tạo hướng dẫn chuẩn
    const preQuestionsMatch = content.match(
      /^([\s\S]*?)(?=(?:###?\s*)?(?:Câu|Question|Bài)\s*\d+[\s.:\-–—]|\d+\.\s+[A-ZÀ-Ỹ])/i,
    );
    const preText = preQuestionsMatch ? preQuestionsMatch[1]!.trim() : '';
    statement =
      preText ||
      '### Hướng dẫn làm bài\nĐọc kỹ nội dung và ngữ liệu đính kèm (nếu có), sau đó chọn đáp án chính xác cho từng câu hỏi bên dưới.';
  }

  const languages: LanguageKey[] =
    Object.keys(starterCode).length > 0
      ? (Object.keys(starterCode) as LanguageKey[])
      : ['python', 'cpp', 'javascript'];

  const cleanTitle = (title || fallbackTitle.replace(/\.[^/.]+$/, ''))
    .replace(/^["'“”«»]+|["'“”«»]+$/g, '')
    .trim();
  const rawCat =
    category || (detectedType === 'QUIZ' ? 'Đọc hiểu & Ngữ liệu' : 'Lập trình & Thuật toán');
  const cleanCategory = rawCat.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();

  return {
    title: cleanTitle,
    type: detectedType,
    category: cleanCategory,
    difficulty: parseDifficulty(difficultyRaw),
    statement,
    passage: passage || null,
    audioUrl: audioUrl || null,
    videoUrl: videoUrl || null,
    imageUrl: imageUrl || null,
    questions,
    languages,
    starterCode,
    testCases,
  };
}
