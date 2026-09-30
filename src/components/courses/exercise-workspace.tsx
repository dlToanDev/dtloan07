'use client';

import { useEffect, useState, useTransition, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Play, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { runExerciseCode, submitExerciseCode, type SubmitResult } from '@/server/actions/learn';
import { DEFAULT_STARTER, LANGUAGES, type LanguageKey } from '@/lib/judge/languages';
import type { SampleRun } from '@/lib/judge/grade';
import { TONE_CLASS, VERDICT_LABEL } from '@/lib/courses/verdicts';

const CodeEditor = dynamic(
  () => import('@/components/courses/code-editor').then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="border-border bg-muted/30 text-muted-foreground flex h-[280px] items-center justify-center rounded-lg border text-sm">
        Đang tải trình soạn code…
      </div>
    ),
  },
);

export interface ExerciseView {
  id: string;
  title: string;
  languages: LanguageKey[];
  starterCode: Partial<Record<LanguageKey, string>>;
  timeLimitMs: number;
  memoryLimitMb: number;
  samples: { input: string; expectedOutput: string }[];
  totalTests: number;
}

const draftKey = (exerciseId: string, language: string) => `code:${exerciseId}:${language}`;
const readDraft = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeDraft = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* trình duyệt chặn lưu trữ — bỏ qua */
  }
};

function Pre({ children, tone }: { children: ReactNode; tone?: 'bad' }) {
  return (
    <pre
      className={`max-h-48 overflow-auto rounded-md px-3 py-2 font-mono text-xs whitespace-pre-wrap ${
        tone === 'bad' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-muted/60'
      }`}
    >
      {children === '' ? <span className="text-muted-foreground italic">(trống)</span> : children}
    </pre>
  );
}

function VerdictChip({ verdict }: { verdict: keyof typeof VERDICT_LABEL }) {
  const { label, tone } = VERDICT_LABEL[verdict];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

export function ExerciseWorkspace({
  exercise,
  index,
  statement,
  solved: initiallySolved,
  lastSubmission,
}: {
  exercise: ExerciseView;
  index: number;
  statement: ReactNode;
  solved: boolean;
  lastSubmission?: { language: LanguageKey; code: string };
}) {
  const router = useRouter();
  const [language, setLanguage] = useState<LanguageKey>(
    lastSubmission && exercise.languages.includes(lastSubmission.language)
      ? lastSubmission.language
      : exercise.languages[0]!,
  );
  const starterFor = (lang: LanguageKey) => exercise.starterCode[lang] ?? DEFAULT_STARTER[lang];
  const [code, setCode] = useState(() =>
    lastSubmission?.language === language ? lastSubmission.code : starterFor(language),
  );
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState(exercise.samples[0]?.input ?? '');
  const [runs, setRuns] = useState<SampleRun[] | null>(null);
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const [error, setError] = useState('');
  const [solved, setSolved] = useState(initiallySolved);
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<'run' | 'submit' | null>(null);

  // Code đang gõ dở (lưu trong trình duyệt) được ưu tiên hơn bài đã nộp / code mẫu.
  useEffect(() => {
    const draft = readDraft(draftKey(exercise.id, language));
    if (draft !== null) setCode(draft);
    // Chỉ đọc một lần khi mở trang; đổi ngôn ngữ đã tự đọc nháp trong switchLanguage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeCode = (value: string) => {
    setCode(value);
    writeDraft(draftKey(exercise.id, language), value);
  };

  const switchLanguage = (next: LanguageKey) => {
    setLanguage(next);
    setCode(
      readDraft(draftKey(exercise.id, next)) ??
        (lastSubmission?.language === next ? lastSubmission.code : starterFor(next)),
    );
  };

  const run = () => {
    setAction('run');
    setError('');
    setSubmitted(null);
    startTransition(async () => {
      const result = await runExerciseCode({
        exerciseId: exercise.id,
        language,
        code,
        ...(useCustomInput && { customInput }),
      });
      if (result.ok) setRuns(result.data);
      else setError(result.error);
    });
  };

  const submit = () => {
    setAction('submit');
    setError('');
    setRuns(null);
    startTransition(async () => {
      const result = await submitExerciseCode({ exerciseId: exercise.id, language, code });
      if (!result.ok) return setError(result.error);
      setSubmitted(result.data);
      if (result.data.result.verdict === 'ACCEPTED') setSolved(true);
      if (result.data.lessonCompleted) router.refresh();
    });
  };

  const verdict = submitted?.result;
  const failed = verdict?.details.find((d) => d.verdict !== 'ACCEPTED');

  return (
    <section
      id={`bai-tap-${index}`}
      className="border-border bg-card scroll-mt-24 space-y-4 rounded-xl border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">
          Bài tập {index}: {exercise.title}
        </h3>
        {solved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" /> Đã giải
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            Giới hạn: {exercise.timeLimitMs / 1000}s · {exercise.memoryLimitMb} MB
          </span>
        )}
      </div>

      {statement}

      {exercise.samples.length > 0 && (
        <div className="space-y-2">
          {exercise.samples.map((sample, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">Ví dụ {i + 1} — Input</p>
                <Pre>{sample.input}</Pre>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">Output</p>
                <Pre>{sample.expectedOutput}</Pre>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={language}
          onChange={(event) => switchLanguage(event.target.value as LanguageKey)}
          className="border-border bg-background rounded-lg border px-3 py-1.5 text-sm"
          aria-label="Ngôn ngữ"
        >
          {exercise.languages.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGES[lang].label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Xóa code hiện tại và dùng lại code mẫu?'))
              changeCode(starterFor(language));
          }}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          <RotateCcw className="size-3.5" /> Code mẫu
        </button>
        {language === 'java' && (
          <span className="text-muted-foreground text-xs">Java: đặt tên lớp là Main.</span>
        )}
      </div>

      <CodeEditor value={code} onChange={changeCode} language={language} />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-primary size-4"
          checked={useCustomInput}
          onChange={(event) => setUseCustomInput(event.target.checked)}
        />
        Tự nhập input khi chạy thử
      </label>
      {useCustomInput && (
        <textarea
          value={customInput}
          onChange={(event) => setCustomInput(event.target.value)}
          rows={3}
          spellCheck={false}
          className="border-border bg-background w-full rounded-lg border px-3 py-2 font-mono text-sm"
          placeholder="Input cho chương trình…"
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={run} disabled={pending}>
          {pending && action === 'run' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          Chạy thử
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending && action === 'submit' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {pending && action === 'submit' ? 'Đang chấm…' : 'Nộp bài'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {runs && (
        <div className="space-y-3">
          {runs.map((item, i) => (
            <div key={i} className="border-border space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {item.expected === null ? 'Kết quả chạy' : `Ví dụ ${i + 1}`}
                {item.status === 'COMPILE_ERROR' ? (
                  <VerdictChip verdict="COMPILE_ERROR" />
                ) : item.verdict ? (
                  <VerdictChip verdict={item.verdict} />
                ) : item.status !== 'OK' ? (
                  <VerdictChip verdict={item.status} />
                ) : null}
                <span className="text-muted-foreground ml-auto text-xs">{item.timeMs} ms</span>
              </div>
              {item.status === 'COMPILE_ERROR' ? (
                <Pre tone="bad">{item.stderr}</Pre>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Output của bạn</p>
                    <Pre>{item.stdout}</Pre>
                  </div>
                  {item.expected !== null && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Output mong đợi</p>
                      <Pre>{item.expected}</Pre>
                    </div>
                  )}
                  {item.stderr && (
                    <div className="space-y-1 sm:col-span-2">
                      <p className="text-muted-foreground text-xs">Lỗi (stderr)</p>
                      <Pre tone="bad">{item.stderr}</Pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {verdict && (
        <div className="space-y-3">
          <div
            className={`rounded-lg p-3 text-sm font-medium ${TONE_CLASS[VERDICT_LABEL[verdict.verdict].tone]}`}
          >
            {verdict.verdict === 'ACCEPTED'
              ? `✅ Chính xác! Qua ${verdict.total}/${verdict.total} test.`
              : verdict.verdict === 'COMPILE_ERROR'
                ? '❌ Lỗi biên dịch — sửa lỗi rồi nộp lại.'
                : `❌ ${VERDICT_LABEL[verdict.verdict].label} ở test ${failed?.index}${
                    failed?.isSample ? ' (ví dụ)' : ' (test ẩn)'
                  } — qua ${verdict.passed}/${verdict.total} test.`}
          </div>
          {submitted?.lessonCompleted && (
            <p className="rounded-lg bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              🎉 Bạn đã hoàn thành bài học này — bài tiếp theo đã được mở!
            </p>
          )}
          {verdict.message && <Pre tone="bad">{verdict.message}</Pre>}
          {verdict.details.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {verdict.details.map((d) => (
                <span
                  key={d.index}
                  title={`${VERDICT_LABEL[d.verdict].label} · ${d.timeMs} ms · ${Math.round(d.memoryKb / 1024)} MB`}
                  className={`rounded px-2 py-0.5 font-mono text-xs ${TONE_CLASS[VERDICT_LABEL[d.verdict].tone]}`}
                >
                  #{d.index} {d.verdict === 'ACCEPTED' ? '✓' : '✗'}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
