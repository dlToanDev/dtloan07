'use client';

import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Loader2, Play, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  createExercise,
  deleteExercise,
  generateExpectedOutputs,
  saveExercise,
  tryReferenceSolution,
} from '@/server/actions/course-lessons';
import { DEFAULT_STARTER, LANGUAGE_KEYS, LANGUAGES, type LanguageKey } from '@/lib/judge/languages';
import type { GradeResult } from '@/lib/judge/grade';
import { TONE_CLASS, VERDICT_LABEL } from '@/lib/courses/verdicts';
import { safeAction } from '@/lib/courses/safe-action';

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
  statement: string;
  languages: LanguageKey[];
  starterCode: Partial<Record<LanguageKey, string>>;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: { input: string; expectedOutput: string; isSample: boolean }[];
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
  const [open, setOpen] = useState(initial.testCases.length === 0);
  const [value, setValue] = useState(initial);
  const [tests, setTests] = useState<TestRow[]>(() => initial.testCases.map(withKey));
  const [starterTab, setStarterTab] = useState<LanguageKey>(initial.languages[0] ?? 'cpp');
  const [refLanguage, setRefLanguage] = useState<LanguageKey>(initial.languages[0] ?? 'cpp');
  const [refCode, setRefCode] = useState('');
  const [refResult, setRefResult] = useState<GradeResult | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

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

  const save = () =>
    startTransition(async () => {
      const result = await safeAction(() =>
        saveExercise(value.id, { ...value, testCases: plainTests() }),
      );
      if (!result.ok) return setMessage({ tone: 'bad', text: result.error });
      setDirty(false);
      setMessage({ tone: 'ok', text: 'Đã lưu bài tập.' });
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

  const samples = tests.filter((test) => test.isSample).length;

  return (
    <section className="border-border bg-card rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            Bài tập {index}: {value.title}
            {dirty && <span className="ml-2 text-xs font-normal text-amber-600">● chưa lưu</span>}
          </span>
          <span className="text-muted-foreground text-xs">
            {value.languages.map((l) => LANGUAGES[l].label).join(', ') || 'chưa chọn ngôn ngữ'} ·{' '}
            {tests.length} test ({samples} ví dụ, {tests.length - samples} ẩn)
          </span>
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {open && (
        <div className="border-border space-y-5 border-t px-5 py-5">
          <label className="block space-y-1.5 text-sm font-medium">
            Tên bài tập
            <input
              className={inputClass}
              value={value.title}
              maxLength={200}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </label>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Đề bài</p>
            <RichTextEditor
              value={value.statement}
              onChange={(statement) => patch({ statement })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Ngôn ngữ được dùng</p>
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
                      className={`rounded-md px-2 py-1 text-xs ${
                        starterTab === lang ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {LANGUAGES[lang].label}
                    </button>
                  ))}
                </div>
              </div>
              <CodeEditor
                key={starterTab}
                language={starterTab}
                minHeight="160px"
                value={value.starterCode[starterTab] ?? DEFAULT_STARTER[starterTab]}
                onChange={(code) =>
                  patch({ starterCode: { ...value.starterCode, [starterTab]: code } })
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Bộ test{' '}
              <span className="text-muted-foreground font-normal">
                — “Ví dụ” hiện cho học viên xem; test còn lại ẩn. Học viên phải qua hết.
              </span>
            </p>
            {tests.map((test, i) => (
              <div key={test.key} className="border-border space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">Test {i + 1}</span>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={test.isSample}
                      onChange={(event) => patchTest(test.key, { isSample: event.target.checked })}
                    />
                    Ví dụ (hiện cho học viên)
                  </label>
                  {refResult?.details[i] && (
                    <span
                      className={`rounded px-1.5 text-xs ${
                        TONE_CLASS[VERDICT_LABEL[refResult.details[i]!.verdict].tone]
                      }`}
                    >
                      {VERDICT_LABEL[refResult.details[i]!.verdict].label}
                    </span>
                  )}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive ml-auto"
                    title="Xóa test"
                    onClick={() => {
                      setTests((prev) => prev.filter((item) => item.key !== test.key));
                      setDirty(true);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <textarea
                    className={`${inputClass} font-mono text-xs`}
                    rows={3}
                    spellCheck={false}
                    placeholder="Input"
                    value={test.input}
                    onChange={(event) => patchTest(test.key, { input: event.target.value })}
                  />
                  <textarea
                    className={`${inputClass} font-mono text-xs`}
                    rows={3}
                    spellCheck={false}
                    placeholder="Output mong đợi"
                    value={test.expectedOutput}
                    onChange={(event) =>
                      patchTest(test.key, { expectedOutput: event.target.value })
                    }
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setTests((prev) => [
                  ...prev,
                  withKey({ input: '', expectedOutput: '', isSample: prev.length === 0 }),
                ]);
                setDirty(true);
              }}
            >
              <Plus className="size-4" /> Thêm test
            </Button>
          </div>

          <div className="bg-muted/30 space-y-3 rounded-lg p-4">
            <div>
              <p className="text-sm font-medium">
                Lời giải mẫu (không hiện cho học viên, không lưu)
              </p>
              <p className="text-muted-foreground text-xs">
                Dán lời giải của bạn để kiểm tra bộ test, hoặc chỉ viết input rồi bấm “Tạo output”
                để máy tự điền đáp án.
              </p>
            </div>
            <select
              value={refLanguage}
              onChange={(event) => setRefLanguage(event.target.value as LanguageKey)}
              className="border-border bg-background rounded-lg border px-3 py-1.5 text-sm"
            >
              {LANGUAGE_KEYS.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGES[lang].label}
                </option>
              ))}
            </select>
            <CodeEditor
              language={refLanguage}
              minHeight="140px"
              value={refCode}
              onChange={setRefCode}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runReference}
                disabled={pending}
              >
                <Play className="size-4" /> Chạy với bộ test
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillOutputs}
                disabled={pending}
              >
                <Wand2 className="size-4" /> Tạo output từ lời giải
              </Button>
            </div>
            {refResult && (
              <p
                className={`rounded-md p-2 text-sm ${TONE_CLASS[VERDICT_LABEL[refResult.verdict].tone]}`}
              >
                {refResult.verdict === 'ACCEPTED'
                  ? `Lời giải qua ${refResult.total}/${refResult.total} test — bộ test ổn.`
                  : `${VERDICT_LABEL[refResult.verdict].label}: qua ${refResult.passed}/${refResult.total} test.`}
                {refResult.message && (
                  <pre className="mt-2 font-mono text-xs whitespace-pre-wrap">
                    {refResult.message}
                  </pre>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{' '}
              Lưu bài tập
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={remove}
              disabled={pending}
              className="hover:text-destructive"
            >
              <Trash2 className="size-4" /> Xóa
            </Button>
            {message && (
              <span
                className={`text-sm ${message.tone === 'bad' ? 'text-red-600' : 'text-emerald-600'}`}
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

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Bài tập cuối bài ({exercises.length})</h2>
        <p className="text-muted-foreground text-sm">
          Học viên phải làm đúng hết các bài tập này mới mở được bài tiếp theo. Không có bài tập thì
          học viên tự bấm “Hoàn thành bài học”.
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
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await safeAction(() => createExercise(lessonId));
            if (!result.ok) return setError(result.error);
            setExercises((prev) => [
              ...prev,
              {
                id: result.data.id,
                title: `Bài tập ${prev.length + 1}`,
                statement: '',
                languages: ['cpp', 'python'],
                starterCode: {},
                timeLimitMs: 2000,
                memoryLimitMb: 256,
                testCases: [],
              },
            ]);
            router.refresh();
          })
        }
      >
        <Plus className="size-4" /> Thêm bài tập
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
