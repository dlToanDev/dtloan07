'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, X, Copy, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { QuestionBankPickerModal } from '@/components/admin/practice/question-bank-picker-modal';
import { MaterialBankPickerModal } from '@/components/admin/practice/material-bank-picker-modal';
import { ExerciseDocumentImportModal } from '@/components/admin/practice/exercise-document-import-modal';
import { saveExercise, uploadQuizMedia } from '@/server/actions/course-lessons';
import {
  deletePracticeExercise,
  createPracticeExercise,
  type PracticeExerciseDetailForEdit,
  type BankQuestionItem,
  type BankMaterialItem,
} from '@/server/actions/practice';
import { safeAction } from '@/lib/courses/safe-action';
import { LANGUAGE_KEYS, LANGUAGES, type LanguageKey } from '@/lib/judge/languages';
import type { QuizQuestion, QuizQuestionType } from '@/lib/courses/quiz';
import type { ParsedExerciseData } from '@/lib/courses/exercise-document-parser';

const RichTextEditor = dynamic(
  () => import('@/components/admin/rich-text-editor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="border-border bg-muted/20 text-muted-foreground flex h-40 items-center justify-center rounded-xl border text-xs">
        Đang tải trình soạn thảo…
      </div>
    ),
  },
);

const CodeEditor = dynamic(
  () => import('@/components/courses/code-editor').then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => <div className="bg-muted/30 h-40 rounded-lg" />,
  },
);

const inputClass =
  'border-border bg-background w-full rounded-xl border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';

interface PracticeExerciseEditorProps {
  initial: PracticeExerciseDetailForEdit;
  bankQuestions: BankQuestionItem[];
  materials?: BankMaterialItem[];
  isNew?: boolean;
}

export function PracticeExerciseEditor({
  initial,
  bankQuestions,
  materials = [],
  isNew = false,
}: PracticeExerciseEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState<PracticeExerciseDetailForEdit>(initial);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modals
  const [isBankPickerOpen, setIsBankPickerOpen] = useState(false);
  const [isMaterialPickerOpen, setIsMaterialPickerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Upload refs
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Code state
  const [starterTab, setStarterTab] = useState<LanguageKey>(initial.languages[0] ?? 'python');

  const isQuiz = value.type === 'QUIZ';

  const patch = (next: Partial<PracticeExerciseDetailForEdit>) => {
    setValue((prev) => ({ ...prev, ...next }));
    setDirty(true);
  };

  // Keyboard shortcut Ctrl+S / Cmd+S để lưu nhanh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value]);

  // Upload Handlers
  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAudio(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadQuizMedia(fd);
      if (res.ok) {
        patch({ audioUrl: res.data.url });
        setMessage({ tone: 'ok', text: 'Tải file âm thanh lên thành công!' });
      } else {
        setMessage({ tone: 'bad', text: res.error });
      }
    } catch {
      setMessage({ tone: 'bad', text: 'Lỗi tải file âm thanh lên máy chủ.' });
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadQuizMedia(fd);
      if (res.ok) {
        patch({ imageUrl: res.data.url });
        setMessage({ tone: 'ok', text: 'Tải hình ảnh lên thành công!' });
      } else {
        setMessage({ tone: 'bad', text: res.error });
      }
    } catch {
      setMessage({ tone: 'bad', text: 'Lỗi tải file ảnh lên máy chủ.' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Quiz Question management
  const handleAddQuestion = (type: QuizQuestionType = 'SINGLE') => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      prompt: `Câu hỏi ${(value.questions?.length ?? 0) + 1}: `,
      options:
        type !== 'FILL_BLANK'
          ? [
              { id: 'opt-a', text: 'Phương án A', isCorrect: true },
              { id: 'opt-b', text: 'Phương án B', isCorrect: false },
              { id: 'opt-c', text: 'Phương án C', isCorrect: false },
              { id: 'opt-d', text: 'Phương án D', isCorrect: false },
            ]
          : undefined,
      acceptableAnswers: type === 'FILL_BLANK' ? [''] : undefined,
      explanation: '',
    };
    patch({ questions: [...(value.questions ?? []), newQ] });
  };

  const handleUpdateQuestion = (index: number, next: Partial<QuizQuestion>) => {
    const questions = [...(value.questions ?? [])];
    if (!questions[index]) return;
    questions[index] = { ...questions[index], ...next };
    patch({ questions });
  };

  const handleDeleteQuestion = (index: number) => {
    const questions = (value.questions ?? []).filter((_, i) => i !== index);
    patch({ questions });
  };

  const handleDuplicateQuestion = (index: number) => {
    const source = value.questions?.[index];
    if (!source) return;
    const duplicated: QuizQuestion = {
      ...JSON.parse(JSON.stringify(source)),
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      prompt: `${source.prompt} (Bản sao)`,
    };
    const questions = [...(value.questions ?? [])];
    questions.splice(index + 1, 0, duplicated);
    patch({ questions });
  };

  const handleMoveQuestion = (index: number, direction: 'UP' | 'DOWN') => {
    const questions = [...(value.questions ?? [])];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const [moved] = questions.splice(index, 1);
    if (!moved) return;
    questions.splice(targetIndex, 0, moved);
    patch({ questions });
  };

  // Add questions from Question Bank
  const handleAddFromBank = (selectedQuestions: QuizQuestion[]) => {
    patch({
      questions: [...(value.questions ?? []), ...selectedQuestions],
    });
    setMessage({
      tone: 'ok',
      text: `Đã nạp ${selectedQuestions.length} câu hỏi từ Ngân hàng vào đề thi! Nhớ bấm "Lưu bài tập".`,
    });
  };

  // Add parsed content from Document Modal
  const handleImportDocumentIntoCurrent = (parsed: ParsedExerciseData) => {
    const nextQuestions =
      parsed.type === 'QUIZ' && parsed.questions.length > 0
        ? [...(value.questions ?? []), ...parsed.questions]
        : value.questions;

    const nextTests =
      parsed.type === 'CODE' && parsed.testCases.length > 0
        ? [...value.testCases, ...parsed.testCases]
        : value.testCases;

    patch({
      title:
        value.title.startsWith('Đề trắc nghiệm & Ngữ liệu #') && parsed.title
          ? parsed.title
          : value.title,
      passage: parsed.passage || value.passage,
      audioUrl: parsed.audioUrl || value.audioUrl,
      videoUrl: parsed.videoUrl || value.videoUrl,
      imageUrl: parsed.imageUrl || value.imageUrl,
      category: parsed.category || value.category,
      difficulty: parsed.difficulty || value.difficulty,
      questions: nextQuestions,
      testCases: nextTests,
    });

    setIsImportModalOpen(false);
    setMessage({
      tone: 'ok',
      text: 'Đã nạp câu hỏi và học liệu từ tài liệu vào đề! Nhớ bấm "Lưu bài tập".',
    });
  };

  // Code language toggle
  const toggleLanguage = (lang: LanguageKey) => {
    const languages = value.languages.includes(lang)
      ? value.languages.filter((l) => l !== lang)
      : LANGUAGE_KEYS.filter((l) => l === lang || value.languages.includes(l));
    patch({ languages });
    if (!languages.includes(starterTab) && languages[0]) setStarterTab(languages[0]);
  };

  // Select material from Material Bank
  const handleSelectMaterial = (mat: BankMaterialItem) => {
    patch({
      passage: mat.passage || value.passage,
      audioUrl: mat.audioUrl || value.audioUrl,
      videoUrl: mat.videoUrl || value.videoUrl,
      imageUrl: mat.imageUrl || value.imageUrl,
      category: value.category ? value.category : mat.category,
    });
    setMessage({
      tone: 'ok',
      text: `Đã nạp ngữ liệu "${mat.title}" từ kho vào đề! Nhớ bấm "${isNew ? 'Tạo đề thi' : 'Lưu bài tập'}".`,
    });
  };

  // Save handler
  const handleSave = () => {
    startTransition(async () => {
      if (isNew) {
        const createRes = await safeAction(() =>
          createPracticeExercise({
            title: value.title,
            type: isQuiz ? 'QUIZ' : 'CODE',
            statement: value.statement,
            passage: value.passage || null,
            audioUrl: value.audioUrl || null,
            imageUrl: value.imageUrl || null,
            videoUrl: value.videoUrl || null,
            isPublicPractice: Boolean(value.isPublicPractice),
            category: value.category?.trim() || null,
            difficulty: value.difficulty ?? 'MEDIUM',
            questions: isQuiz ? (value.questions ?? []) : [],
            languages: isQuiz ? [] : value.languages,
            starterCode: isQuiz ? {} : value.starterCode,
            timeLimitMs: value.timeLimitMs,
            memoryLimitMb: value.memoryLimitMb,
            testCases: isQuiz
              ? []
              : value.testCases.map((t) => ({
                  input: t.input,
                  expectedOutput: t.expectedOutput,
                  isSample: t.isSample,
                })),
          }),
        );

        if (!createRes.ok) {
          return setMessage({ tone: 'bad', text: createRes.error });
        }
        setDirty(false);
        router.push(`/admin/practice/${createRes.data.id}`);
        return;
      }

      const result = await safeAction(() =>
        saveExercise(value.id, {
          title: value.title,
          type: isQuiz ? 'QUIZ' : 'CODE',
          statement: value.statement,
          passage: value.passage || null,
          audioUrl: value.audioUrl || null,
          imageUrl: value.imageUrl || null,
          videoUrl: value.videoUrl || null,
          isPublicPractice: Boolean(value.isPublicPractice),
          category: value.category?.trim() || null,
          difficulty: value.difficulty ?? 'MEDIUM',
          questions: isQuiz ? (value.questions ?? []) : [],
          languages: isQuiz ? [] : value.languages,
          starterCode: isQuiz ? {} : value.starterCode,
          timeLimitMs: value.timeLimitMs,
          memoryLimitMb: value.memoryLimitMb,
          testCases: isQuiz
            ? []
            : value.testCases.map((t) => ({
                input: t.input,
                expectedOutput: t.expectedOutput,
                isSample: t.isSample,
              })),
        }),
      );

      if (!result.ok) {
        setMessage({ tone: 'bad', text: result.error });
      } else {
        setDirty(false);
        setMessage({ tone: 'ok', text: 'Đã lưu cấu hình bài tập & đề thi thành công!' });
      }
    });
  };

  // Delete handler
  const handleDelete = () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${value.title}" khỏi kho luyện đề?`)) return;
    startTransition(async () => {
      try {
        const res = await deletePracticeExercise(value.id);
        if (res.ok) {
          router.push('/admin/practice');
        }
      } catch (err) {
        setMessage({ tone: 'bad', text: err instanceof Error ? err.message : 'Lỗi xóa bài tập.' });
      }
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* STICKY TOP ACTION BAR */}
      <div className="border-border bg-card/95 sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-sm backdrop-blur-md sm:px-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/practice"
            className="border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground inline-flex cursor-pointer items-center rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
          >
            <span>← Kho luyện đề</span>
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                isQuiz ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'
              }`}
            >
              {isQuiz ? 'Trắc nghiệm & Ngữ liệu' : 'Lập trình (Code)'}
            </span>
            {dirty && (
              <span className="text-warning flex items-center gap-1 text-[11px] font-semibold">
                ● Chưa lưu thay đổi
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <Link
              href={`/courses/practice/${value.id}`}
              target="_blank"
              className="border-border hover:bg-muted text-foreground inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
            >
              <span>Làm thử ↗</span>
            </Link>
          )}

          {!isNew && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer text-xs font-semibold"
            >
              Xóa đề
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="bg-primary text-primary-foreground cursor-pointer text-xs font-bold shadow-sm hover:opacity-90"
          >
            {isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {isNew ? 'Tạo đề thi vào hệ thống' : 'Lưu bài tập (Ctrl+S)'}
          </Button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl p-3.5 text-xs font-semibold ${
            message.tone === 'ok'
              ? 'border-success/30 bg-success/10 text-success border'
              : 'border-destructive/30 bg-destructive/10 text-destructive border'
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="cursor-pointer text-xs hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* PHẦN 1: THÔNG TIN CHUNG & CẤU HÌNH ĐỀ THI */}
      {/* ============================================================== */}
      <section className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-xs sm:p-6">
        <h2 className="text-foreground text-base font-bold">
          1. Thông tin chung & Cài đặt hiển thị
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-foreground text-xs font-bold">Tên đề thi / Bài tập *</label>
            <input
              type="text"
              value={value.title}
              maxLength={200}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="VD: Đề thi thử TOEIC Reading & Listening hoặc Hai con trỏ"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-foreground text-xs font-bold">Dạng bài tập</label>
            <Select
              value={value.type}
              fullWidth
              onChange={(val) => {
                const newType = val as 'CODE' | 'QUIZ';
                patch({ type: newType });
                if (newType === 'QUIZ' && (!value.questions || value.questions.length === 0)) {
                  handleAddQuestion('SINGLE');
                }
              }}
              options={[
                { value: 'QUIZ', label: 'Trắc nghiệm & Ngữ liệu (TOEIC, TOPIK, Đọc hiểu...)' },
                { value: 'CODE', label: 'Lập trình (Chạy mã nguồn & Test cases)' },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-semibold">
              Chuyên mục / Chủ đề:
            </label>
            <input
              type="text"
              value={value.category ?? ''}
              onChange={(e) => patch({ category: e.target.value })}
              placeholder="VD: Tiếng Anh, Đọc hiểu, Thuật toán, Web..."
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-semibold">Mức độ khó:</label>
            <Select
              value={value.difficulty ?? 'MEDIUM'}
              fullWidth
              onChange={(val) => patch({ difficulty: val as 'EASY' | 'MEDIUM' | 'HARD' })}
              options={[
                { value: 'EASY', label: 'Dễ (Easy)' },
                { value: 'MEDIUM', label: 'Trung bình (Medium)' },
                { value: 'HARD', label: 'Khó (Hard)' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2 sm:pt-6">
            <input
              type="checkbox"
              id="isPublicPractice"
              checked={Boolean(value.isPublicPractice)}
              onChange={(e) => patch({ isPublicPractice: e.target.checked })}
              className="accent-primary size-4.5 cursor-pointer rounded"
            />
            <label
              htmlFor="isPublicPractice"
              className="text-foreground cursor-pointer text-xs font-bold"
            >
              Mở luyện đề FREE cho người dùng
            </label>
          </div>
        </div>

        {/* Đề bài / Hướng dẫn */}
        <div className="space-y-1.5 pt-2">
          <label className="text-foreground text-xs font-bold">
            Đề bài & Hướng dẫn làm bài (Markdown / RichText)
          </label>
          <RichTextEditor value={value.statement} onChange={(statement) => patch({ statement })} />
        </div>
      </section>

      {/* ============================================================== */}
      {/* PHẦN 2: KHO HỌC LIỆU & NGỮ LIỆU ĐA PHƯƠNG TIỆN */}
      {/* ============================================================== */}
      <section className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-xs sm:p-6">
        <div className="border-border/80 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-primary text-base font-bold">
              2. Kho Học Liệu & Ngữ Liệu Đa Phương Tiện
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Tự nhập bài đọc hiểu, audio nghe, video hoặc chọn ngay từ kho học liệu có sẵn trong hệ
              thống.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsMaterialPickerOpen(true)}
            className="border-primary/40 text-primary hover:bg-primary/10 cursor-pointer text-xs font-bold"
          >
            Chọn Ngữ liệu từ kho ({materials.length})
          </Button>
        </div>

        {/* 1. ĐOẠN VĂN NGỮ LIỆU / BÀI ĐỌC (PASSAGE) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-foreground text-xs font-bold">
              Đoạn văn bản / Bài đọc hiểu (Passage)
            </label>
            <span className="text-muted-foreground text-[11px]">
              Hỗ trợ dán bài đọc dài, hội thoại, đặc tả
            </span>
          </div>
          <textarea
            rows={5}
            value={value.passage ?? ''}
            onChange={(e) => patch({ passage: e.target.value })}
            placeholder="Dán đoạn văn ngữ liệu bài đọc hiểu, trích đoạn bài báo, đề thi reading hoặc đặc tả tại đây..."
            className={`${inputClass} font-sans leading-relaxed`}
          />
        </div>

        {/* 2. ÂM THANH NGHE HIỂU (AUDIO) */}
        <div className="border-border/60 space-y-2 border-t pt-2">
          <div className="flex items-center justify-between">
            <label className="text-foreground text-xs font-bold">
              File âm thanh nghe hiểu (Audio URL)
            </label>
            <span className="text-muted-foreground text-[11px]">
              Phục vụ bài thi nghe TOEIC / IELTS / TOPIK
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={value.audioUrl ?? ''}
              onChange={(e) => patch({ audioUrl: e.target.value })}
              placeholder="https://... hoặc tải từ máy (.mp3, .wav, .m4a)"
              className={`${inputClass} flex-1`}
            />
            <input
              type="file"
              ref={audioInputRef}
              accept="audio/*"
              onChange={handleUploadAudio}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => audioInputRef.current?.click()}
              disabled={isUploadingAudio}
              className="shrink-0 cursor-pointer text-xs"
            >
              {isUploadingAudio && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              Tải âm thanh
            </Button>
            {value.audioUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => patch({ audioUrl: null })}
                className="text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Gỡ bỏ link audio"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          {value.audioUrl && (
            <div className="border-info/20 bg-info/5 max-w-lg rounded-xl border p-2.5">
              <audio controls src={value.audioUrl} className="h-9 w-full" />
            </div>
          )}
        </div>

        {/* 3. VIDEO BÀI GIẢNG / ĐỀ BÀI (VIDEO) */}
        <div className="border-border/60 space-y-1.5 border-t pt-2">
          <label className="text-foreground text-xs font-bold">
            Video hướng dẫn / bài tập (Link YouTube hoặc MP4)
          </label>
          <input
            type="text"
            value={value.videoUrl ?? ''}
            onChange={(e) => patch({ videoUrl: e.target.value })}
            placeholder="https://www.youtube.com/embed/... hoặc link video MP4"
            className={inputClass}
          />
        </div>

        {/* 4. HÌNH ẢNH MINH HỌA / SƠ ĐỒ (IMAGE) */}
        <div className="border-border/60 space-y-2 border-t pt-2">
          <div className="flex items-center justify-between">
            <label className="text-foreground text-xs font-bold">
              Hình ảnh minh họa (Image URL)
            </label>
            <span className="text-muted-foreground text-[11px]">Sơ đồ, tranh mô tả, biểu đồ</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={value.imageUrl ?? ''}
              onChange={(e) => patch({ imageUrl: e.target.value })}
              placeholder="https://... hoặc tải từ máy"
              className={`${inputClass} flex-1`}
            />
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploadingImage}
              className="shrink-0 cursor-pointer text-xs"
            >
              {isUploadingImage && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              Tải ảnh lên
            </Button>
            {value.imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => patch({ imageUrl: null })}
                className="text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Gỡ bỏ ảnh"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          {value.imageUrl && (
            <div className="pt-1">
              <img
                src={value.imageUrl}
                alt="Minh họa"
                className="border-border bg-background h-32 rounded-xl border object-contain"
              />
            </div>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* PHẦN 3A: SOẠN CÂU HỎI TRẮC NGHIỆM (QUIZ)                       */}
      {/* ============================================================== */}
      {isQuiz ? (
        <section className="border-border bg-card space-y-5 rounded-2xl border p-4 shadow-xs sm:p-6">
          {/* TOOLBAR QUẢN LÝ CÂU HỎI */}
          <div className="border-border/80 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-foreground text-base font-bold">
                3. Danh sách câu hỏi ({value.questions?.length ?? 0})
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Bạn có thể tự nhập câu hỏi, chọn câu hỏi có sẵn từ ngân hàng, hoặc nhập từ file
                Word/MDX.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Nút 1: Tự nhập câu hỏi */}
              <Button
                type="button"
                size="sm"
                onClick={() => handleAddQuestion('SINGLE')}
                className="cursor-pointer text-xs font-bold"
              >
                + Thêm câu hỏi thủ công
              </Button>

              {/* Nút 2: CHỌN CÂU HỎI TỪ KHO */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsBankPickerOpen(true)}
                className="border-primary/40 text-primary hover:bg-primary/10 cursor-pointer text-xs font-bold"
              >
                Chọn câu hỏi từ kho ({bankQuestions.length})
              </Button>

              {/* Nút 3: Nhập từ Word / MDX */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsImportModalOpen(true)}
                className="cursor-pointer text-xs font-semibold"
              >
                Nhập từ Word / MDX
              </Button>
            </div>
          </div>

          {/* DANH SÁCH CÂU HỎI */}
          <div className="space-y-4">
            {!value.questions || value.questions.length === 0 ? (
              <div className="border-border space-y-3 rounded-xl border border-dashed p-10 text-center">
                <p className="text-foreground text-sm font-bold">
                  Chưa có câu hỏi nào trong đề thi
                </p>
                <p className="text-muted-foreground mx-auto max-w-md text-xs">
                  Hãy bắt đầu bằng cách bấm <strong>&quot;+ Thêm câu hỏi thủ công&quot;</strong>,
                  hoặc bấm <strong>&quot;Chọn câu hỏi từ kho&quot;</strong> để tái sử dụng câu hỏi
                  từ các đề khác.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddQuestion('SINGLE')}
                    className="text-xs font-semibold"
                  >
                    + Thêm câu hỏi đầu tiên
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsBankPickerOpen(true)}
                    className="text-xs font-semibold"
                  >
                    Duyệt ngân hàng câu hỏi
                  </Button>
                </div>
              </div>
            ) : (
              value.questions.map((q, qIndex) => (
                <div
                  key={q.id || qIndex}
                  className="border-border/80 bg-muted/15 hover:border-border space-y-4 rounded-2xl border p-4 transition-all sm:p-5"
                >
                  {/* Question Card Header */}
                  <div className="border-border/60 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg text-xs font-bold">
                        {qIndex + 1}
                      </span>
                      <span className="text-foreground text-sm font-bold">Câu {qIndex + 1}</span>

                      {/* Loại câu hỏi */}
                      <Select
                        value={q.type}
                        size="sm"
                        onChange={(val) => {
                          const newType = val as QuizQuestionType;
                          handleUpdateQuestion(qIndex, {
                            type: newType,
                            options:
                              newType !== 'FILL_BLANK' && (!q.options || q.options.length === 0)
                                ? [
                                    { id: 'opt-a', text: 'Phương án A', isCorrect: true },
                                    { id: 'opt-b', text: 'Phương án B', isCorrect: false },
                                  ]
                                : q.options,
                            acceptableAnswers:
                              newType === 'FILL_BLANK' ? q.acceptableAnswers || [''] : undefined,
                          });
                        }}
                        options={[
                          { value: 'SINGLE', label: 'Trắc nghiệm 1 đáp án đúng' },
                          { value: 'MULTIPLE', label: 'Trắc nghiệm nhiều đáp án đúng' },
                          { value: 'FILL_BLANK', label: 'Điền từ vào chỗ trống' },
                        ]}
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Di chuyển lên/xuống */}
                      <button
                        type="button"
                        disabled={qIndex === 0}
                        onClick={() => handleMoveQuestion(qIndex, 'UP')}
                        className="text-muted-foreground hover:bg-muted cursor-pointer rounded p-1 disabled:opacity-30"
                        title="Di chuyển lên"
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={qIndex === (value.questions?.length ?? 0) - 1}
                        onClick={() => handleMoveQuestion(qIndex, 'DOWN')}
                        className="text-muted-foreground hover:bg-muted cursor-pointer rounded p-1 disabled:opacity-30"
                        title="Di chuyển xuống"
                      >
                        <ChevronDown className="size-4" />
                      </button>

                      {/* Nhân bản */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateQuestion(qIndex)}
                        className="text-muted-foreground hover:bg-muted cursor-pointer rounded p-1"
                        title="Nhân bản câu hỏi này"
                      >
                        <Copy className="size-4" />
                      </button>

                      {/* Xóa */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIndex)}
                        className="text-destructive hover:bg-destructive/10 cursor-pointer rounded p-1"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Nội dung câu hỏi */}
                  <div className="space-y-1.5">
                    <label className="text-foreground text-xs font-semibold">
                      Nội dung câu hỏi:
                    </label>
                    <textarea
                      rows={2}
                      value={q.prompt}
                      onChange={(e) => handleUpdateQuestion(qIndex, { prompt: e.target.value })}
                      placeholder="Nhập nội dung câu hỏi..."
                      className={inputClass}
                    />
                  </div>

                  {/* Các phương án (nếu là SINGLE hoặc MULTIPLE) */}
                  {q.type !== 'FILL_BLANK' && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-muted-foreground text-xs font-semibold">
                          Các lựa chọn phương án (Tích chọn để đánh dấu đáp án đúng):
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const currentOptions = q.options ?? [];
                            const newOpt = {
                              id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                              text: `Phương án ${String.fromCharCode(65 + currentOptions.length)}`,
                              isCorrect: false,
                            };
                            handleUpdateQuestion(qIndex, {
                              options: [...currentOptions, newOpt],
                            });
                          }}
                          className="text-primary hover:bg-primary/10 h-7 cursor-pointer text-xs"
                        >
                          + Thêm lựa chọn
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {q.options?.map((opt, optIndex) => {
                          const optLabel = String.fromCharCode(65 + optIndex);
                          const isRadio = q.type === 'SINGLE';
                          return (
                            <div
                              key={opt.id || optIndex}
                              className={`flex items-center gap-2 rounded-xl border p-2 text-xs transition ${
                                opt.isCorrect
                                  ? 'border-success/50 bg-success/5'
                                  : 'border-border/70 bg-background'
                              }`}
                            >
                              {/* Chọn đúng */}
                              <input
                                type={isRadio ? 'radio' : 'checkbox'}
                                name={`correct-${q.id}`}
                                checked={Boolean(opt.isCorrect)}
                                onChange={() => {
                                  if (isRadio) {
                                    const nextOptions = (q.options ?? []).map((o, idx) => ({
                                      ...o,
                                      isCorrect: idx === optIndex,
                                    }));
                                    handleUpdateQuestion(qIndex, { options: nextOptions });
                                  } else {
                                    const nextOptions = (q.options ?? []).map((o, idx) =>
                                      idx === optIndex ? { ...o, isCorrect: !o.isCorrect } : o,
                                    );
                                    handleUpdateQuestion(qIndex, { options: nextOptions });
                                  }
                                }}
                                className="accent-success ml-1 size-4 cursor-pointer"
                              />

                              <span className="w-5 shrink-0 text-center text-xs font-bold">
                                {optLabel}.
                              </span>

                              {/* Input text */}
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const nextOptions = [...(q.options ?? [])];
                                  nextOptions[optIndex] = { ...opt, text: e.target.value };
                                  handleUpdateQuestion(qIndex, { options: nextOptions });
                                }}
                                className="flex-1 bg-transparent text-xs focus:outline-none"
                                placeholder={`Nội dung lựa chọn ${optLabel}...`}
                              />

                              {/* Nút xóa lựa chọn */}
                              {(q.options?.length ?? 0) > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextOptions = (q.options ?? []).filter(
                                      (_, i) => i !== optIndex,
                                    );
                                    handleUpdateQuestion(qIndex, { options: nextOptions });
                                  }}
                                  className="text-muted-foreground hover:text-destructive cursor-pointer p-1"
                                  title="Xóa lựa chọn này"
                                >
                                  <X className="size-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Lời giải thích */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-muted-foreground text-xs font-semibold">
                      Giải thích chi tiết đáp án:
                    </label>
                    <textarea
                      rows={2}
                      value={q.explanation ?? ''}
                      onChange={(e) =>
                        handleUpdateQuestion(qIndex, { explanation: e.target.value })
                      }
                      placeholder="Giải thích vì sao đáp án trên chính xác (học viên sẽ thấy sau khi nộp bài)..."
                      className={inputClass}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : (
        /* ============================================================== */
        /* PHẦN 3B: CẤU HÌNH BÀI TẬP LẬP TRÌNH (CODE)                     */
        /* ============================================================== */
        <section className="border-border bg-card space-y-5 rounded-2xl border p-4 shadow-xs sm:p-6">
          <h2 className="text-foreground text-base font-bold">
            3. Ngôn ngữ & Bộ Test Cases Lập trình
          </h2>

          {/* Chọn ngôn ngữ */}
          <div className="space-y-2">
            <label className="text-foreground text-xs font-bold">Ngôn ngữ cho phép nộp bài:</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_KEYS.map((lang) => {
                const active = value.languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted border'
                    }`}
                  >
                    {LANGUAGES[lang].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Starter code */}
          {value.languages.length > 0 && (
            <div className="space-y-2 pt-2">
              <label className="text-foreground text-xs font-bold">
                Mã nguồn mẫu khởi đầu (Starter Code):
              </label>
              <div className="border-border flex gap-2 border-b pb-2">
                {value.languages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setStarterTab(lang)}
                    className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      starterTab === lang
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {LANGUAGES[lang].label}
                  </button>
                ))}
              </div>

              <CodeEditor
                language={starterTab}
                value={value.starterCode[starterTab] ?? ''}
                onChange={(code) => {
                  patch({
                    starterCode: { ...value.starterCode, [starterTab]: code },
                  });
                }}
              />
            </div>
          )}

          {/* Quản lý Test cases */}
          <div className="border-border/80 space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <label className="text-foreground text-xs font-bold">
                Danh sách Test Cases ({value.testCases.length})
              </label>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  patch({
                    testCases: [
                      ...value.testCases,
                      { input: '', expectedOutput: '', isSample: value.testCases.length === 0 },
                    ],
                  });
                }}
                className="cursor-pointer text-xs"
              >
                + Thêm Test Case
              </Button>
            </div>

            <div className="space-y-3">
              {value.testCases.map((tc, tcIdx) => (
                <div
                  key={tc.id || tcIdx}
                  className="border-border bg-muted/15 space-y-2 rounded-xl border p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-xs font-bold">Test #{tcIdx + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={tc.isSample}
                          onChange={(e) => {
                            const next = [...value.testCases];
                            next[tcIdx] = { ...tc, isSample: e.target.checked };
                            patch({ testCases: next });
                          }}
                          className="accent-primary size-3.5"
                        />
                        <span>Hiện làm ví dụ</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = value.testCases.filter((_, i) => i !== tcIdx);
                          patch({ testCases: next });
                        }}
                        className="text-destructive hover:bg-destructive/10 cursor-pointer rounded p-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground text-[11px] font-semibold">
                        Input:
                      </span>
                      <textarea
                        rows={2}
                        value={tc.input}
                        onChange={(e) => {
                          const next = [...value.testCases];
                          next[tcIdx] = { ...tc, input: e.target.value };
                          patch({ testCases: next });
                        }}
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px] font-semibold">
                        Expected Output:
                      </span>
                      <textarea
                        rows={2}
                        value={tc.expectedOutput}
                        onChange={(e) => {
                          const next = [...value.testCases];
                          next[tcIdx] = { ...tc, expectedOutput: e.target.value };
                          patch({ testCases: next });
                        }}
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MODAL 1: CHỌN CÂU HỎI TỪ KHO */}
      <QuestionBankPickerModal
        isOpen={isBankPickerOpen}
        onClose={() => setIsBankPickerOpen(false)}
        bankQuestions={bankQuestions}
        onSelectQuestions={handleAddFromBank}
      />

      {/* MODAL 2: CHỌN NGỮ LIỆU TỪ KHO */}
      <MaterialBankPickerModal
        isOpen={isMaterialPickerOpen}
        onClose={() => setIsMaterialPickerOpen(false)}
        materials={materials}
        onSelectMaterial={handleSelectMaterial}
      />

      {/* MODAL 3: NHẬP TỪ WORD / MDX */}
      <ExerciseDocumentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportIntoCurrent={handleImportDocumentIntoCurrent}
      />
    </div>
  );
}
