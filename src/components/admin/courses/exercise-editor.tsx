'use client';

import { useState, useTransition, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Plus,
  Save,
  Trash2,
  Wand2,
  Code2,
  ListChecks,
  Volume2,
  Image as ImageIcon,
  Video,
  FileText,
  Copy,
  Upload,
  X,
  FileCode,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ExerciseDocumentImportModal } from '@/components/admin/practice/exercise-document-import-modal';
import {
  createExercise,
  deleteExercise,
  generateExpectedOutputs,
  saveExercise,
  tryReferenceSolution,
  uploadQuizMedia,
} from '@/server/actions/course-lessons';
import { DEFAULT_STARTER, LANGUAGE_KEYS, LANGUAGES, type LanguageKey } from '@/lib/judge/languages';
import type { GradeResult } from '@/lib/judge/grade';
import { safeAction } from '@/lib/courses/safe-action';
import type { QuizQuestion, QuizQuestionType } from '@/lib/courses/quiz';

const RichTextEditor = dynamic(
  () => import('@/components/admin/rich-text-editor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => <p className="text-muted-foreground p-4 text-sm">Đang tải trình soạn thảo…</p>,
  },
);
const CodeEditor = dynamic(
  () => import('@/components/courses/code-editor').then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => <div className="bg-muted/30 h-40 rounded-lg" />,
  },
);

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2 text-sm';

export interface ExerciseEditorValue {
  id: string;
  title: string;
  type?: 'CODE' | 'QUIZ';
  statement: string;
  passage?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  questions?: QuizQuestion[];
  languages: LanguageKey[];
  starterCode: Partial<Record<LanguageKey, string>>;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: { input: string; expectedOutput: string; isSample: boolean }[];
  isPublicPractice?: boolean;
  category?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

type TestRow = ExerciseEditorValue['testCases'][number] & { key: number };
let keySeq = 0;
const withKey = (test: ExerciseEditorValue['testCases'][number]): TestRow => ({
  ...test,
  key: ++keySeq,
});

function ExerciseCard({
  initial,
  index,
  onDeleted,
}: {
  initial: ExerciseEditorValue;
  index: number;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(
    initial.type === 'QUIZ'
      ? (initial.questions?.length ?? 0) === 0
      : initial.testCases.length === 0,
  );
  const [value, setValue] = useState<ExerciseEditorValue>({
    ...initial,
    type: initial.type || 'CODE',
    questions: initial.questions || [],
  });
  const [tests, setTests] = useState<TestRow[]>(() => initial.testCases.map(withKey));
  const [starterTab, setStarterTab] = useState<LanguageKey>(initial.languages[0] ?? 'cpp');
  const [refLanguage, setRefLanguage] = useState<LanguageKey>(initial.languages[0] ?? 'cpp');
  const [refCode, setRefCode] = useState('');
  const [refResult, setRefResult] = useState<GradeResult | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  // Media upload refs
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const patch = (next: Partial<ExerciseEditorValue>) => {
    setValue((prev) => ({ ...prev, ...next }));
    setDirty(true);
  };

  const patchTest = (key: number, next: Partial<TestRow>) => {
    setTests((prev) => prev.map((test) => (test.key === key ? { ...test, ...next } : test)));
    setDirty(true);
  };

  const plainTests = () =>
    tests.map(({ input, expectedOutput, isSample }) => ({ input, expectedOutput, isSample }));

  const toggleLanguage = (lang: LanguageKey) => {
    const languages = value.languages.includes(lang)
      ? value.languages.filter((l) => l !== lang)
      : LANGUAGE_KEYS.filter((l) => l === lang || value.languages.includes(l));
    patch({ languages });
    if (!languages.includes(starterTab) && languages[0]) setStarterTab(languages[0]);
  };

  // Upload handlers
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
      } else {
        setMessage({ tone: 'bad', text: res.error });
      }
    } catch {
      setMessage({ tone: 'bad', text: 'Lỗi tải file ảnh lên máy chủ.' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Quiz question management
  const addQuestion = (type: QuizQuestionType = 'SINGLE') => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      prompt: `Câu hỏi ${(value.questions?.length ?? 0) + 1}`,
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

  const updateQuestion = (index: number, next: Partial<QuizQuestion>) => {
    const questions = [...(value.questions ?? [])];
    if (!questions[index]) return;
    questions[index] = { ...questions[index], ...next };
    patch({ questions });
  };

  const deleteQuestion = (index: number) => {
    const questions = (value.questions ?? []).filter((_, i) => i !== index);
    patch({ questions });
  };

  const duplicateQuestion = (index: number) => {
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

  const save = () =>
    startTransition(async () => {
      const isQuiz = value.type === 'QUIZ';
      const result = await safeAction(() =>
        saveExercise(value.id, {
          ...value,
          type: isQuiz ? 'QUIZ' : 'CODE',
          languages: isQuiz ? [] : value.languages,
          testCases: isQuiz ? [] : plainTests(),
          questions: isQuiz ? (value.questions ?? []) : [],
          isPublicPractice: Boolean(value.isPublicPractice),
          category: value.category?.trim() || null,
          difficulty: value.difficulty ?? 'MEDIUM',
        }),
      );
      if (!result.ok) return setMessage({ tone: 'bad', text: result.error });
      setDirty(false);
      setMessage({ tone: 'ok', text: 'Đã lưu bài tập thành công!' });
    });

  const runReference = () =>
    startTransition(async () => {
      setRefResult(null);
      const result = await safeAction(() =>
        tryReferenceSolution({
          language: refLanguage,
          code: refCode,
          timeLimitMs: value.timeLimitMs,
          memoryLimitMb: value.memoryLimitMb,
          testCases: plainTests(),
        }),
      );
      if (!result.ok) return setMessage({ tone: 'bad', text: result.error });
      setRefResult(result.data);
      setMessage(null);
    });

  const fillOutputs = () => {
    if (
      tests.some((test) => test.expectedOutput.trim()) &&
      !window.confirm('Ghi đè output của mọi test bằng kết quả chạy lời giải mẫu?')
    )
      return;
    startTransition(async () => {
      const result = await safeAction(() =>
        generateExpectedOutputs({
          language: refLanguage,
          code: refCode,
          timeLimitMs: value.timeLimitMs,
          memoryLimitMb: value.memoryLimitMb,
          inputs: tests.map((test) => test.input),
        }),
      );
      if (!result.ok) return setMessage({ tone: 'bad', text: result.error });
      const failed = result.data.findIndex((item) => item.error);
      if (failed >= 0)
        return setMessage({
          tone: 'bad',
          text: `Test ${failed + 1}: ${result.data[failed]!.error}`,
        });
      setTests((prev) =>
        prev.map((test, i) => ({ ...test, expectedOutput: result.data[i]!.stdout })),
      );
      setDirty(true);
      setMessage({ tone: 'ok', text: 'Đã điền output — nhớ bấm Lưu bài tập.' });
    });
  };

  const remove = () => {
    if (!window.confirm(`Xóa "${value.title}" cùng các bài nộp của học viên?`)) return;
    startTransition(async () => {
      const result = await safeAction(() => deleteExercise(value.id));
      if (!result.ok) return setMessage({ tone: 'bad', text: result.error });
      onDeleted();
    });
  };

  const isQuiz = value.type === 'QUIZ';

  return (
    <section className="border-border bg-card rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-semibold">
            <span>
              Bài tập {index}: {value.title}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                isQuiz ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'
              }`}
            >
              {isQuiz ? '📝 Trắc nghiệm / Ngữ liệu' : '💻 Lập trình'}
            </span>
            {dirty && <span className="text-warning text-xs font-normal">● chưa lưu</span>}
          </span>
          <span className="text-muted-foreground text-xs">
            {isQuiz ? (
              <>
                {value.questions?.length ?? 0} câu hỏi •{' '}
                {value.passage?.trim() ? 'Có bài đọc • ' : ''}
                {value.audioUrl ? 'Có file nghe • ' : ''}
                {value.imageUrl ? 'Có ảnh minh họa' : ''}
              </>
            ) : (
              <>
                {value.languages.map((l) => LANGUAGES[l].label).join(', ') || 'chưa chọn ngôn ngữ'}{' '}
                · {tests.length} test ({tests.filter((t) => t.isSample).length} ví dụ)
              </>
            )}
          </span>
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {open && (
        <div className="border-border space-y-6 border-t px-5 py-5">
          {/* Header Controls: Tên & Chuyển loại bài tập */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-semibold">Tên bài tập</label>
              <input
                className={inputClass}
                value={value.title}
                maxLength={200}
                onChange={(event) => patch({ title: event.target.value })}
                placeholder="VD: Part 5: Incomplete Sentences hoặc Hai con trỏ"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Dạng bài tập</label>
              <Select
                value={value.type}
                fullWidth
                onChange={(val) => {
                  const newType = val as 'CODE' | 'QUIZ';
                  patch({ type: newType });
                  if (newType === 'QUIZ' && (!value.questions || value.questions.length === 0)) {
                    addQuestion('SINGLE');
                  }
                }}
                options={[
                  { value: 'QUIZ', label: '📝 Trắc nghiệm & Điền từ (TOEIC, TOPIK...)' },
                  { value: 'CODE', label: '💻 Lập trình (Chạy code & Test cases)' },
                ]}
              />
            </div>
          </div>

          {/* Đề bài / Hướng dẫn */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Đề bài & Hướng dẫn (Markdown)</p>
            <RichTextEditor
              value={value.statement}
              onChange={(statement) => patch({ statement })}
            />
          </div>

          {/* Cấu hình đưa vào trang Luyện đề */}
          <div className="border-border bg-muted/20 grid gap-3 rounded-xl border p-3.5 text-xs sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`practice-${value.id}`}
                checked={Boolean(value.isPublicPractice)}
                onChange={(e) => patch({ isPublicPractice: e.target.checked })}
                className="accent-primary size-4 cursor-pointer rounded"
              />
              <label
                htmlFor={`practice-${value.id}`}
                className="text-foreground cursor-pointer font-semibold"
              >
                🌟 Đăng lên trang Luyện đề (Khách làm FREE)
              </label>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium">Chuyên mục / Chủ đề:</label>
              <input
                type="text"
                value={value.category ?? ''}
                onChange={(e) => patch({ category: e.target.value })}
                placeholder="VD: Thuật toán, TOEIC, Web Dev..."
                className="border-border bg-background w-full rounded-md border px-2.5 py-1 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium">Mức độ khó:</label>
              <Select
                value={value.difficulty ?? 'MEDIUM'}
                fullWidth
                size="sm"
                onChange={(val) => patch({ difficulty: val as 'EASY' | 'MEDIUM' | 'HARD' })}
                options={[
                  { value: 'EASY', label: 'Dễ (Easy)' },
                  { value: 'MEDIUM', label: 'Trung bình (Medium)' },
                  { value: 'HARD', label: 'Nâng cao / Khó (Hard)' },
                ]}
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* KHO HỌC LIỆU & NGỮ LIỆU ĐA PHƯƠNG TIỆN (Passage, Audio, Video, Image) */}
          {/* ============================================================== */}
          <div className="border-border bg-muted/20 space-y-4 rounded-xl border p-4 sm:p-5">
            <div className="text-primary flex items-center gap-2 text-sm font-bold">
              <FileText className="size-4" /> Kho học liệu & Ngữ liệu (Đoạn văn / Âm thanh / Video /
              Hình ảnh)
            </div>
            <p className="text-muted-foreground text-xs">
              Học liệu đính kèm phục vụ đề bài (bài đọc hiểu, đoạn nghe audio, video hướng dẫn hoặc
              sơ đồ hình ảnh). Có thể để trống nếu không dùng.
            </p>

            {/* Đoạn văn ngữ liệu */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Đoạn văn bản / Bài đọc (Passage)</label>
              <textarea
                rows={4}
                value={value.passage ?? ''}
                onChange={(e) => patch({ passage: e.target.value })}
                placeholder="Dán đoạn văn bản, ngữ liệu đọc hiểu, đặc tả kỹ thuật hoặc hội thoại tại đây..."
                className={inputClass}
              />
            </div>

            {/* File âm thanh Audio */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold">
                  <Volume2 className="text-primary size-3.5" /> File âm thanh nghe (Audio URL)
                </label>
                <span className="text-muted-foreground text-[11px]">
                  Tải tệp .mp3 hoặc dán link
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={value.audioUrl ?? ''}
                  onChange={(e) => patch({ audioUrl: e.target.value })}
                  placeholder="https://... hoặc tải từ máy"
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
                  className="shrink-0 cursor-pointer gap-1 text-xs"
                >
                  {isUploadingAudio ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  Tải âm thanh
                </Button>
                {value.audioUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => patch({ audioUrl: null })}
                    className="text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Xóa link audio"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              {value.audioUrl && (
                <div className="pt-1">
                  <audio controls src={value.audioUrl} className="h-9 w-full max-w-md" />
                </div>
              )}
            </div>

            {/* Hình ảnh ngữ liệu */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold">
                  <ImageIcon className="text-primary size-3.5" /> Hình ảnh minh họa (Image URL)
                </label>
                <span className="text-muted-foreground text-[11px]">
                  Tải ảnh tranh mô tả / sơ đồ
                </span>
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
                  className="shrink-0 cursor-pointer gap-1 text-xs"
                >
                  {isUploadingImage ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  Tải ảnh lên
                </Button>
                {value.imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => patch({ imageUrl: null })}
                    className="text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Xóa ảnh"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              {value.imageUrl && (
                <div className="pt-1">
                  <img
                    src={value.imageUrl}
                    alt="Preview"
                    className="border-border bg-background h-28 rounded-lg border object-contain"
                  />
                </div>
              )}
            </div>

            {/* Video URL */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold">
                <Video className="text-primary size-3.5" /> Video bài tập (Link YouTube / MP4)
              </label>
              <input
                type="text"
                value={value.videoUrl ?? ''}
                onChange={(e) => patch({ videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/embed/... hoặc link mp4"
                className={inputClass}
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* CHẾ ĐỘ 1: BÀI TẬP TRẮC NGHIỆM & ĐIỀN TỪ (TOEIC / TOPIK / ...)  */}
          {/* ============================================================== */}
          {isQuiz ? (
            <div className="space-y-6 pt-2">
              {/* DANH SÁCH CÂU HỎI TRẮC NGHIỆM & ĐIỀN TỪ */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <ListChecks className="text-primary size-4" /> 2. Danh sách câu hỏi (
                    {value.questions?.length ?? 0})
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addQuestion('SINGLE')}
                      className="cursor-pointer gap-1.5 text-xs"
                    >
                      <Plus className="size-3.5" /> Trắc nghiệm 1 đáp án
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addQuestion('MULTIPLE')}
                      className="cursor-pointer gap-1.5 text-xs"
                    >
                      <Plus className="size-3.5" /> Chọn nhiều đáp án
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addQuestion('FILL_BLANK')}
                      className="cursor-pointer gap-1.5 text-xs"
                    >
                      <Plus className="size-3.5" /> Điền từ / Điền text
                    </Button>
                  </div>
                </div>

                {/* Danh sách từng câu hỏi */}
                <div className="space-y-4">
                  {(value.questions ?? []).map((q, qIndex) => (
                    <div
                      key={q.id}
                      className="border-border bg-card space-y-4 rounded-xl border p-4 sm:p-5"
                    >
                      {/* Tiêu đề câu hỏi + actions */}
                      <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                        <div className="flex items-center gap-3">
                          <span className="bg-primary/10 text-primary rounded-md px-2.5 py-1 text-xs font-bold">
                            Câu {qIndex + 1}
                          </span>
                          <Select
                            value={q.type}
                            size="sm"
                            onChange={(val) => {
                              const nextType = val as QuizQuestionType;
                              updateQuestion(qIndex, {
                                type: nextType,
                                options:
                                  nextType !== 'FILL_BLANK' &&
                                  (!q.options || q.options.length === 0)
                                    ? [
                                        { id: 'opt-a', text: 'Phương án A', isCorrect: true },
                                        { id: 'opt-b', text: 'Phương án B', isCorrect: false },
                                        { id: 'opt-c', text: 'Phương án C', isCorrect: false },
                                        { id: 'opt-d', text: 'Phương án D', isCorrect: false },
                                      ]
                                    : q.options,
                              });
                            }}
                            options={[
                              { value: 'SINGLE', label: '🔘 1 đáp án đúng' },
                              { value: 'MULTIPLE', label: '☑️ Nhiều đáp án đúng' },
                              { value: 'FILL_BLANK', label: '✏️ Điền văn bản / điền từ' },
                            ]}
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateQuestion(qIndex)}
                            className="text-muted-foreground hover:text-foreground size-8 cursor-pointer p-0"
                            title="Nhân bản câu hỏi"
                          >
                            <Copy className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(qIndex)}
                            className="text-destructive hover:bg-destructive/10 size-8 cursor-pointer p-0"
                            title="Xóa câu hỏi"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Prompt câu hỏi */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">Nội dung câu hỏi *</label>
                        <input
                          type="text"
                          value={q.prompt}
                          onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                          placeholder="VD: What is the main purpose of the announcement?"
                          className={inputClass}
                        />
                      </div>

                      {/* Các lựa chọn (Single & Multiple Choice) */}
                      {q.type !== 'FILL_BLANK' && (
                        <div className="space-y-2.5 pt-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>Các lựa chọn (Tích chọn đáp án đúng):</span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = q.options || [];
                                const letter = String.fromCharCode(65 + current.length);
                                const newOpt = {
                                  id: `opt-${Date.now()}-${current.length}`,
                                  text: `Phương án ${letter}`,
                                  isCorrect: false,
                                };
                                updateQuestion(qIndex, { options: [...current, newOpt] });
                              }}
                              className="text-primary flex cursor-pointer items-center gap-1 text-[11px] hover:underline"
                            >
                              <Plus className="size-3" /> Thêm lựa chọn
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(q.options || []).map((opt, oIndex) => {
                              const letter = String.fromCharCode(65 + oIndex);
                              return (
                                <div key={opt.id} className="flex items-center gap-2.5">
                                  {q.type === 'SINGLE' ? (
                                    <input
                                      type="radio"
                                      name={`correct-${q.id}`}
                                      checked={Boolean(opt.isCorrect)}
                                      onChange={() => {
                                        const nextOptions = (q.options || []).map((o) => ({
                                          ...o,
                                          isCorrect: o.id === opt.id,
                                        }));
                                        updateQuestion(qIndex, { options: nextOptions });
                                      }}
                                      title="Chọn làm đáp án đúng duy nhất"
                                      className="accent-primary size-4 cursor-pointer"
                                    />
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={Boolean(opt.isCorrect)}
                                      onChange={(e) => {
                                        const nextOptions = (q.options || []).map((o) =>
                                          o.id === opt.id
                                            ? { ...o, isCorrect: e.target.checked }
                                            : o,
                                        );
                                        updateQuestion(qIndex, { options: nextOptions });
                                      }}
                                      title="Chọn làm một trong các đáp án đúng"
                                      className="accent-primary size-4 cursor-pointer rounded"
                                    />
                                  )}
                                  <span className="text-muted-foreground w-4 text-xs font-bold">
                                    {letter}.
                                  </span>
                                  <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => {
                                      const nextOptions = (q.options || []).map((o) =>
                                        o.id === opt.id ? { ...o, text: e.target.value } : o,
                                      );
                                      updateQuestion(qIndex, { options: nextOptions });
                                    }}
                                    className={`${inputClass} flex-1`}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const nextOptions = (q.options || []).filter(
                                        (o) => o.id !== opt.id,
                                      );
                                      updateQuestion(qIndex, { options: nextOptions });
                                    }}
                                    className="text-muted-foreground hover:text-destructive size-7 cursor-pointer p-0"
                                  >
                                    <X className="size-3.5" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Đáp án dạng điền từ (FILL_BLANK) */}
                      {q.type === 'FILL_BLANK' && (
                        <div className="space-y-1.5 pt-1">
                          <label className="text-xs font-semibold">
                            Các đáp án chấp nhận (phân cách bằng dấu phẩy) *
                          </label>
                          <input
                            type="text"
                            value={(q.acceptableAnswers || []).join(', ')}
                            onChange={(e) => {
                              const answers = e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              updateQuestion(qIndex, { acceptableAnswers: answers });
                            }}
                            placeholder="VD: Friday, friday, FRIDAY"
                            className={inputClass}
                          />
                          <p className="text-muted-foreground text-[11px]">
                            Hệ thống tự động bỏ qua viết hoa/viết thường và khoảng trắng thừa khi
                            chấm.
                          </p>
                        </div>
                      )}

                      {/* Lời giải thích / dịch nghĩa */}
                      <div className="space-y-1.5 pt-1">
                        <label className="flex items-center gap-1.5 text-xs font-semibold">
                          <HelpCircle className="text-primary size-3.5" /> Lời giải thích & Dẫn
                          chứng (Hiện cho học viên khi nộp bài)
                        </label>
                        <textarea
                          rows={2}
                          value={q.explanation || ''}
                          onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                          placeholder="VD: Theo dòng 3 của đoạn văn: 'The conference will take place at...'"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* CHẾ ĐỘ 2: BÀI TẬP LẬP TRÌNH (CODE & JUDGE TESTS)                */
            /* ============================================================== */
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold">Ngôn ngữ được dùng</p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_KEYS.map((lang) => (
                      <label
                        key={lang}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${
                          value.languages.includes(lang)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={value.languages.includes(lang)}
                          onChange={() => toggleLanguage(lang)}
                        />
                        {LANGUAGES[lang].label}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="block space-y-1.5 text-sm">
                  Thời gian / test (ms)
                  <input
                    type="number"
                    min={100}
                    max={3000}
                    step={100}
                    className={`${inputClass} w-32`}
                    value={value.timeLimitMs}
                    onChange={(event) => patch({ timeLimitMs: Number(event.target.value) })}
                  />
                </label>
                <label className="block space-y-1.5 text-sm">
                  Bộ nhớ (MB)
                  <input
                    type="number"
                    min={16}
                    max={512}
                    className={`${inputClass} w-28`}
                    value={value.memoryLimitMb}
                    onChange={(event) => patch({ memoryLimitMb: Number(event.target.value) })}
                  />
                </label>
              </div>

              {value.languages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      Code mẫu cho học viên{' '}
                      <span className="text-muted-foreground font-normal">
                        (để trống = khung mặc định; bài “viết hàm” thì soạn sẵn main())
                      </span>
                    </p>
                    <div className="flex gap-1">
                      {value.languages.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setStarterTab(lang)}
                          className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium ${
                            starterTab === lang
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {LANGUAGES[lang].label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <CodeEditor
                    language={starterTab}
                    value={value.starterCode[starterTab] ?? DEFAULT_STARTER[starterTab]}
                    onChange={(code) =>
                      patch({
                        starterCode: { ...value.starterCode, [starterTab]: code },
                      })
                    }
                    minHeight="140px"
                  />
                </div>
              )}

              {/* Bộ Test Cases */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    Bộ test ({tests.length} test, {tests.filter((t) => t.isSample).length} test mẫu)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTests((prev) => [
                        ...prev,
                        withKey({ input: '', expectedOutput: '', isSample: prev.length === 0 }),
                      ])
                    }
                  >
                    <Plus className="size-3.5" /> Thêm test
                  </Button>
                </div>

                <div className="space-y-3">
                  {tests.map((test, i) => (
                    <div
                      key={test.key}
                      className="border-border bg-muted/20 space-y-2 rounded-lg border p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-semibold">Test {i + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={test.isSample}
                              onChange={(e) => patchTest(test.key, { isSample: e.target.checked })}
                              className="size-3.5 rounded"
                            />
                            <span>Hiện cho học viên (test mẫu)</span>
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTests((prev) => prev.filter((t) => t.key !== test.key));
                              setDirty(true);
                            }}
                            className="text-destructive size-6 p-0"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <textarea
                          rows={3}
                          value={test.input}
                          onChange={(e) => patchTest(test.key, { input: e.target.value })}
                          placeholder="Input chuẩn (stdin)..."
                          className={`${inputClass} font-mono`}
                        />
                        <textarea
                          rows={3}
                          value={test.expectedOutput}
                          onChange={(e) => patchTest(test.key, { expectedOutput: e.target.value })}
                          placeholder="Output mong đợi (stdout)..."
                          className={`${inputClass} font-mono`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kiểm thử lời giải mẫu của Admin */}
                <div className="border-border/80 bg-muted/30 mt-4 space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold">
                      Lời giải mẫu của Admin (Kiểm tra test trước khi lưu)
                    </p>
                    <div className="flex gap-2">
                      <Select
                        value={refLanguage}
                        size="sm"
                        onChange={(val) => setRefLanguage(val as LanguageKey)}
                        options={LANGUAGE_KEYS.map((l) => ({
                          value: l,
                          label: LANGUAGES[l].label,
                        }))}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={runReference}
                        className="gap-1 text-xs"
                      >
                        <Play className="size-3" /> Chạy thử
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={fillOutputs}
                        className="gap-1 text-xs"
                      >
                        <Wand2 className="size-3" /> Tự điền Output
                      </Button>
                    </div>
                  </div>
                  <CodeEditor
                    language={refLanguage}
                    value={refCode}
                    onChange={(code) => setRefCode(code)}
                    minHeight="120px"
                  />
                  {refResult && (
                    <div className="text-xs">
                      Kết quả: <strong>{refResult.verdict}</strong> ({refResult.passed}/
                      {refResult.total} tests đúng)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Save & Delete Buttons */}
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={save}
                disabled={pending}
                className="cursor-pointer gap-2"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Lưu bài tập
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={remove}
                disabled={pending}
                className="hover:text-destructive text-muted-foreground cursor-pointer"
              >
                <Trash2 className="size-4" /> Xóa
              </Button>
            </div>
            {message && (
              <span
                className={`text-sm font-medium ${
                  message.tone === 'bad' ? 'text-destructive' : 'text-success'
                }`}
              >
                {message.text}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function ExerciseList({
  lessonId,
  initial,
}: {
  lessonId: string;
  initial: ExerciseEditorValue[];
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initial);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleCreate = (type: 'CODE' | 'QUIZ') => {
    startTransition(async () => {
      setError('');
      const result = await safeAction(() => createExercise(lessonId, type));
      if (!result.ok) return setError(result.error);
      const isQuiz = type === 'QUIZ';
      setExercises((prev) => [
        ...prev,
        {
          id: result.data.id,
          title: isQuiz
            ? `Trắc nghiệm & Ngữ liệu ${prev.length + 1}`
            : `Bài tập ${prev.length + 1}`,
          type,
          statement: '',
          passage: null,
          audioUrl: null,
          imageUrl: null,
          videoUrl: null,
          questions: isQuiz
            ? [
                {
                  id: 'q1',
                  type: 'SINGLE',
                  prompt: 'Nội dung câu hỏi 1',
                  options: [
                    { id: 'opt-a', text: 'Lựa chọn A', isCorrect: true },
                    { id: 'opt-b', text: 'Lựa chọn B', isCorrect: false },
                    { id: 'opt-c', text: 'Lựa chọn C', isCorrect: false },
                    { id: 'opt-d', text: 'Lựa chọn D', isCorrect: false },
                  ],
                  explanation: 'Giải thích chi tiết vì sao đáp án A chính xác.',
                },
              ]
            : [],
          languages: isQuiz ? [] : ['cpp', 'python'],
          starterCode: {},
          timeLimitMs: 2000,
          memoryLimitMb: 256,
          testCases: [],
        },
      ]);
      router.refresh();
    });
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Bài tập cuối bài ({exercises.length})</h2>
        <p className="text-muted-foreground text-sm">
          Hỗ trợ cả bài tập Lập trình (chạy code) và Trắc nghiệm & Ngữ liệu (bài đọc, audio nghe
          TOEIC/TOPIK, hình ảnh).
        </p>
      </div>
      {exercises.map((exercise, i) => (
        <ExerciseCard
          key={exercise.id}
          initial={exercise}
          index={i + 1}
          onDeleted={() => setExercises((prev) => prev.filter((item) => item.id !== exercise.id))}
        />
      ))}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => handleCreate('QUIZ')}
          className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer gap-2 font-semibold"
        >
          <ListChecks className="size-4" /> + Thêm bài Trắc nghiệm & Ngữ liệu (TOEIC / TOPIK)
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => handleCreate('CODE')}
          className="cursor-pointer gap-2 font-medium"
        >
          <Code2 className="size-4" /> + Thêm bài Lập trình (Code)
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => setIsImportModalOpen(true)}
          className="border-primary/30 text-primary hover:bg-primary/10 cursor-pointer gap-2 font-semibold"
        >
          <FileCode className="size-4" /> 📥 Nhập đề từ Word / MDX
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <ExerciseDocumentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        lessonId={lessonId}
        isPublicPracticeDefault={false}
      />
    </section>
  );
}
