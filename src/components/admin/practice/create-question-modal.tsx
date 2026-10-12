'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ListChecks, Plus, Trash2, X, Loader2, CheckCircle2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { createStandaloneQuestionAction } from '@/server/actions/practice';
import type { QuizOption, QuizQuestionType } from '@/lib/courses/quiz';

interface CreateQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateQuestionModal({ isOpen, onClose }: CreateQuestionModalProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<QuizQuestionType>('SINGLE');
  const [category, setCategory] = useState('Tiếng Anh & Trắc nghiệm');
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState<QuizOption[]>([
    { id: 'opt-1', text: '', isCorrect: true },
    { id: 'opt-2', text: '', isCorrect: false },
    { id: 'opt-3', text: '', isCorrect: false },
    { id: 'opt-4', text: '', isCorrect: false },
  ]);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      return setError('Vui lòng nhập nội dung câu hỏi.');
    }
    const filledOptions = options.filter((o) => o.text.trim());
    if (filledOptions.length < 2) {
      return setError('Cần ít nhất 2 phương án trả lời.');
    }
    if (!filledOptions.some((o) => o.isCorrect)) {
      return setError('Vui lòng tích chọn ít nhất một đáp án đúng.');
    }

    startTransition(async () => {
      try {
        await createStandaloneQuestionAction({
          prompt,
          type,
          category,
          explanation,
          options: filledOptions,
        });
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tạo câu hỏi.');
      }
    });
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm duration-200 sm:p-5">
      <div className="border-border bg-card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        <div className="border-border flex items-center justify-between border-b p-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
              <Plus className="size-5" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-bold">Thêm Câu Hỏi Vào Ngân Hàng</h2>
              <p className="text-muted-foreground text-xs">
                Lưu trữ câu hỏi mẫu để có thể chọn đưa vào nhiều đề thi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted cursor-pointer rounded-lg p-1.5"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-3 text-xs">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-semibold">
                Chuyên mục / Chủ đề:
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="VD: TOEIC, Tiếng Anh, Toán, Lịch sử..."
                className="border-border bg-background w-full rounded-xl border px-3 py-2 text-xs focus:outline-none sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-semibold">Dạng câu hỏi:</label>
              <Select
                value={type}
                fullWidth
                onChange={(val) => setType(val as QuizQuestionType)}
                options={[
                  { value: 'SINGLE', label: 'Trắc nghiệm 1 đáp án đúng' },
                  { value: 'MULTIPLE', label: 'Trắc nghiệm nhiều đáp án đúng' },
                ]}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-foreground text-xs font-bold">Nội dung câu hỏi *</label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="VD: Theo đoạn văn, yếu tố nào đóng vai trò chính trong..."
              className="border-border bg-background focus:ring-primary/20 w-full rounded-xl border px-3 py-2 text-xs focus:ring-2 focus:outline-none sm:text-sm"
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-foreground text-xs font-bold">
                Các phương án trả lời (Tích chọn đáp án đúng):
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setOptions([...options, { id: `opt-${Date.now()}`, text: '', isCorrect: false }])
                }
                className="text-primary h-7 gap-1 text-xs"
              >
                <Plus className="size-3" /> Thêm phương án
              </Button>
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => {
                const label = String.fromCharCode(65 + idx);
                const isRadio = type === 'SINGLE';
                return (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-xs transition ${
                      opt.isCorrect
                        ? 'border-success/50 bg-success/5'
                        : 'border-border/70 bg-background'
                    }`}
                  >
                    <input
                      type={isRadio ? 'radio' : 'checkbox'}
                      name="correct-bank-answer"
                      checked={Boolean(opt.isCorrect)}
                      onChange={() => {
                        if (isRadio) {
                          setOptions(options.map((o, i) => ({ ...o, isCorrect: i === idx })));
                        } else {
                          setOptions(
                            options.map((o, i) =>
                              i === idx ? { ...o, isCorrect: !o.isCorrect } : o,
                            ),
                          );
                        }
                      }}
                      className="accent-success ml-1 size-4 cursor-pointer"
                    />

                    <span className="w-5 shrink-0 text-center text-xs font-bold">{label}.</span>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const next = [...options];
                        next[idx] = { ...opt, text: e.target.value };
                        setOptions(next);
                      }}
                      placeholder={`Nội dung phương án ${label}...`}
                      className="flex-1 bg-transparent text-xs focus:outline-none"
                    />

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1"
                        title="Xóa phương án"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-1.5">
            <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold">
              <HelpCircle className="text-warning size-3.5" /> Giải thích chi tiết đáp án:
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Giải thích vì sao đáp án trên chính xác..."
              className="border-border bg-background w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <div className="border-border flex items-center justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="cursor-pointer gap-1.5 text-xs font-bold"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}{' '}
              Lưu vào Ngân Hàng Câu Hỏi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
