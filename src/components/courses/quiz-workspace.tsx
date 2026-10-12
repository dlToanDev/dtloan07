'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw as RewindIcon,
  Maximize2,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { submitQuizAnswers, type QuizSubmitResult } from '@/server/actions/learn';
import type { StudentQuizQuestion, QuizGradeResult } from '@/lib/courses/quiz';

export interface QuizExerciseView {
  id: string;
  title: string;
  statement?: string | null;
  passage?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  questions: StudentQuizQuestion[];
}

interface QuizWorkspaceProps {
  exercise: QuizExerciseView;
  index: number;
  solved: boolean;
  lastResult?: QuizGradeResult | null;
}

export function QuizWorkspace({
  exercise,
  index,
  solved: initiallySolved,
  lastResult,
}: QuizWorkspaceProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [gradeResult, setGradeResult] = useState<QuizGradeResult | null>(lastResult || null);
  const [isSolved, setIsSolved] = useState(initiallySolved);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Image lightbox state
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const handleSingleSelect = (questionId: string, optionId: string) => {
    if (gradeResult) return; // Không sửa sau khi đã nộp trừ khi bấm làm lại
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setErrorMessage(null);
  };

  const handleMultipleSelect = (questionId: string, optionId: string) => {
    if (gradeResult) return;
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: updated };
    });
    setErrorMessage(null);
  };

  const handleFillBlankChange = (questionId: string, text: string) => {
    if (gradeResult) return;
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
    setErrorMessage(null);
  };

  const handleReset = () => {
    setGradeResult(null);
    setAnswers({});
    setErrorMessage(null);
  };

  const answeredCount = Object.keys(answers).filter((k) => {
    const val = answers[k];
    if (Array.isArray(val)) return val.length > 0;
    return typeof val === 'string' && val.trim().length > 0;
  }).length;

  const handleSubmit = () => {
    if (answeredCount === 0) {
      setErrorMessage('Vui lòng làm ít nhất 1 câu hỏi trước khi nộp bài.');
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);
      const res = await submitQuizAnswers({
        exerciseId: exercise.id,
        answers,
      });

      if (!res.ok) {
        setErrorMessage(res.error);
        return;
      }

      setGradeResult(res.data.result);
      if (res.data.result.passed) {
        setIsSolved(true);
      }
      router.refresh();
    });
  };

  // Audio controls
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const rewindAudio = (seconds = 5) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) audioRef.current.playbackRate = speed;
  };

  const hasMediaOrPassage = Boolean(
    exercise.passage?.trim() || exercise.audioUrl || exercise.imageUrl || exercise.videoUrl,
  );

  return (
    <div className="border-border bg-card space-y-6 rounded-2xl border p-5 shadow-xs transition sm:p-7">
      {/* Header */}
      <div className="border-border/70 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg text-xs font-bold">
            #{index}
          </span>
          <div>
            <h3 className="text-foreground flex items-center gap-2 text-base font-bold sm:text-lg">
              {exercise.title}
              {isSolved && (
                <span className="bg-success/10 text-success inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  <CheckCircle2 className="size-3.5" /> Đã hoàn thành
                </span>
              )}
            </h3>
            <p className="text-muted-foreground text-xs">
              Trắc nghiệm & Ngữ liệu • {exercise.questions.length} câu hỏi
            </p>
          </div>
        </div>

        {gradeResult && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="cursor-pointer gap-1.5 text-xs font-medium"
          >
            <RotateCcw className="size-3.5" /> Làm lại bài
          </Button>
        )}
      </div>

      {/* Statement hướng dẫn nếu có */}
      {exercise.statement?.trim() && (
        <div className="bg-muted/40 text-muted-foreground rounded-xl p-4 text-xs sm:text-sm">
          {exercise.statement}
        </div>
      )}

      {/* Layout 2 cột hoặc Trên/Dưới: Bên trái Ngữ liệu (Passage, Audio, Ảnh), Bên phải Câu hỏi */}
      <div className={`grid gap-6 ${hasMediaOrPassage ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* CỘT NGỮ LIỆU (STIMULUS) */}
        {hasMediaOrPassage && (
          <div className="lg:border-border/70 space-y-4 lg:col-span-6 lg:border-r lg:pr-6">
            <div className="text-primary flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
              <FileText className="size-4" /> Ngữ liệu bài đọc & Nghe
            </div>

            {/* Trình phát Audio nghe (Listening TOEIC / TOPIK) */}
            {exercise.audioUrl && (
              <div className="border-primary/20 bg-primary/5 space-y-3 rounded-xl border p-4">
                <div className="text-primary flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="size-4" /> File nghe Audio
                  </span>
                  <div className="flex items-center gap-1">
                    {[0.75, 1, 1.25].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => changeSpeed(s)}
                        className={`cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                          playbackSpeed === s
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background/80 text-muted-foreground hover:bg-background'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  src={exercise.audioUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                />

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={togglePlayAudio}
                    className="size-9 cursor-pointer rounded-full p-0"
                  >
                    {isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => rewindAudio(5)}
                    className="size-8 cursor-pointer rounded-full p-0 text-xs"
                    title="Tua lại 5 giây"
                  >
                    <RewindIcon className="size-3.5" />
                  </Button>

                  <div className="flex-1 space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCurrentTime(val);
                        if (audioRef.current) audioRef.current.currentTime = val;
                      }}
                      className="accent-primary h-1.5 w-full cursor-pointer"
                    />
                    <div className="text-muted-foreground flex justify-between font-mono text-[10px]">
                      <span>{Math.floor(currentTime)}s</span>
                      <span>{duration ? `${Math.floor(duration)}s` : '--'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hình ảnh ngữ liệu (Tranh TOEIC Part 1 / sơ đồ) */}
            {exercise.imageUrl && (
              <div className="border-border bg-muted/20 group relative overflow-hidden rounded-xl border">
                <img
                  src={exercise.imageUrl}
                  alt="Ngữ liệu bài tập"
                  className="max-h-72 w-full cursor-pointer object-contain transition hover:opacity-95"
                  onClick={() => setIsImageZoomed(true)}
                />
                <button
                  type="button"
                  onClick={() => setIsImageZoomed(true)}
                  className="absolute right-2 bottom-2 flex cursor-pointer items-center gap-1 rounded-md bg-black/60 p-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                >
                  <Maximize2 className="size-3.5" /> Phóng to
                </button>
              </div>
            )}

            {/* Video ngữ liệu nếu có */}
            {exercise.videoUrl && (
              <div className="border-border aspect-video overflow-hidden rounded-xl border">
                <iframe
                  src={exercise.videoUrl}
                  title="Video bài tập"
                  className="size-full border-0"
                  allowFullScreen
                />
              </div>
            )}

            {/* Đoạn văn bài đọc (Passage) */}
            {exercise.passage?.trim() && (
              <div className="border-border/80 bg-muted/30 text-foreground/90 max-h-96 overflow-y-auto rounded-xl border p-4 font-serif text-sm leading-relaxed whitespace-pre-wrap">
                {exercise.passage}
              </div>
            )}
          </div>
        )}

        {/* CỘT CÂU HỎI (QUESTIONS) */}
        <div className={`space-y-6 ${hasMediaOrPassage ? 'lg:col-span-6' : 'col-span-1'}`}>
          <div className="space-y-5">
            {exercise.questions.map((q, qIndex) => {
              const detail = gradeResult?.details.find((d) => d.questionId === q.id);
              const isQCorrect = detail?.isCorrect;
              const hasSubmitted = Boolean(gradeResult);

              return (
                <div
                  key={q.id}
                  className={`space-y-3.5 rounded-xl border p-4 transition sm:p-5 ${
                    hasSubmitted
                      ? isQCorrect
                        ? 'border-success/40 bg-success/5'
                        : 'border-destructive/40 bg-destructive/5'
                      : 'border-border bg-card/60 hover:border-primary/30'
                  }`}
                >
                  {/* Câu hỏi title & badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className="text-primary shrink-0 text-sm font-bold">
                        Câu {qIndex + 1}:
                      </span>
                      <h4 className="text-foreground text-sm leading-snug font-semibold sm:text-base">
                        {q.prompt}
                      </h4>
                    </div>

                    {hasSubmitted && (
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                          isQCorrect
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                        }`}
                      >
                        {isQCorrect ? (
                          <>
                            <CheckCircle2 className="size-3.5" /> Đúng
                          </>
                        ) : (
                          <>
                            <XCircle className="size-3.5" /> Sai
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  {/* 1. DẠNG SINGLE CHOICE (Radio) */}
                  {q.type === 'SINGLE' && (
                    <div className="space-y-2 pt-1">
                      {(q.options || []).map((opt, oIndex) => {
                        const optLetter = String.fromCharCode(65 + oIndex); // A, B, C, D
                        const isSelected = answers[q.id] === opt.id;

                        return (
                          <label
                            key={opt.id}
                            onClick={() => handleSingleSelect(q.id, opt.id)}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition select-none ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border/70 hover:bg-muted/40 text-foreground/90'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={isSelected}
                              disabled={hasSubmitted}
                              onChange={() => handleSingleSelect(q.id, opt.id)}
                              className="accent-primary size-4"
                            />
                            <span className="text-muted-foreground w-4 text-xs font-bold">
                              {optLetter}.
                            </span>
                            <span className="flex-1">{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. DẠNG MULTIPLE CHOICE (Checkbox) */}
                  {q.type === 'MULTIPLE' && (
                    <div className="space-y-2 pt-1">
                      <p className="text-muted-foreground text-[11px] italic">
                        (Chọn tất cả các đáp án đúng)
                      </p>
                      {(q.options || []).map((opt, oIndex) => {
                        const optLetter = String.fromCharCode(65 + oIndex);
                        const selectedList = (answers[q.id] as string[]) || [];
                        const isSelected = selectedList.includes(opt.id);

                        return (
                          <label
                            key={opt.id}
                            onClick={() => handleMultipleSelect(q.id, opt.id)}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition select-none ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border/70 hover:bg-muted/40 text-foreground/90'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={hasSubmitted}
                              onChange={() => handleMultipleSelect(q.id, opt.id)}
                              className="accent-primary size-4 rounded"
                            />
                            <span className="text-muted-foreground w-4 text-xs font-bold">
                              {optLetter}.
                            </span>
                            <span className="flex-1">{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. DẠNG FILL IN THE BLANK (Điền từ) */}
                  {q.type === 'FILL_BLANK' && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={(answers[q.id] as string) || ''}
                        disabled={hasSubmitted}
                        onChange={(e) => handleFillBlankChange(q.id, e.target.value)}
                        placeholder="Nhập câu trả lời của bạn..."
                        className="border-border bg-background focus:border-primary w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-hidden"
                      />
                    </div>
                  )}

                  {/* Chi tiết đáp án đúng & Lời giải thích khi đã nộp */}
                  {hasSubmitted && detail && (
                    <div className="bg-background/80 border-border/60 mt-3 space-y-1.5 rounded-lg border p-3 text-xs">
                      {!isQCorrect && (
                        <p className="text-destructive font-semibold">
                          Đáp án chính xác:{' '}
                          <span className="underline">{detail.correctAnswerText}</span>
                        </p>
                      )}
                      {detail.explanation && (
                        <div className="text-muted-foreground flex items-start gap-1.5 pt-1">
                          <HelpCircle className="text-primary mt-0.5 size-3.5 shrink-0" />
                          <span>
                            <strong>Giải thích:</strong> {detail.explanation}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-destructive/10 border-destructive/20 text-destructive flex items-center gap-2 rounded-xl border p-3 text-xs">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Banner kết quả sau khi nộp */}
          {gradeResult && (
            <div
              className={`space-y-2 rounded-2xl border p-4 text-center sm:p-5 ${
                gradeResult.passed
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-warning/40 bg-warning/10 text-warning'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-base font-bold sm:text-lg">
                {gradeResult.passed ? (
                  <>
                    <Sparkles className="text-success size-5" />
                    <span>Chúc mừng! Bạn đã hoàn thành bài tập 🎉</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="text-warning size-5" />
                    <span>Chưa đạt yêu cầu hoàn thành</span>
                  </>
                )}
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Đúng <strong>{gradeResult.score}</strong> / {gradeResult.total} câu (
                <strong>{gradeResult.percent}%</strong>)
                {gradeResult.passed
                  ? ' • Đạt mục tiêu bài học!'
                  : ' • Cần đúng tối thiểu 80% để mở bài tiếp theo. Hãy bấm "Làm lại bài" để luyện tập tiếp.'}
              </p>
            </div>
          )}

          {/* Thanh Submit */}
          {!gradeResult ? (
            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-muted-foreground text-xs">
                Đã làm: <strong>{answeredCount}</strong> / {exercise.questions.length} câu
              </span>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || answeredCount === 0}
                className="bg-primary text-primary-foreground cursor-pointer gap-2 px-6 text-sm font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Đang chấm điểm…
                  </>
                ) : (
                  <>
                    <Send className="size-4" /> Nộp bài chấm điểm
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="cursor-pointer gap-2 text-sm font-medium"
              >
                <RotateCcw className="size-4" /> Làm lại bài tập
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Phóng to ảnh */}
      {isImageZoomed && exercise.imageUrl && (
        <div
          onClick={() => setIsImageZoomed(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
        >
          <img
            src={exercise.imageUrl}
            alt="Ngữ liệu phóng to"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
