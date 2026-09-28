'use client';

import { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Gift,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface QuizGameProps {
  question?: string;
  options?: string[];
  correctIndex?: number;
  rewardCode?: string;
  rewardDiscount?: string;
}

export function QuizGame({
  question = 'Khung ứng dụng Next.js 15 sử dụng kiến trúc nào làm cốt lõi để tối ưu hiệu năng và SEO?',
  options = [
    'React Server Components (RSC)',
    'Client-Side Rendering Only',
    'Angular Standalone Components',
    'Vue Composition API',
  ],
  correctIndex = 0,
  rewardCode = 'QUIZMASTER30',
  rewardDiscount = 'Giảm 30%',
}: QuizGameProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = () => {
    if (selectedIdx === null) return;
    setSubmitted(true);
    setIsCorrect(selectedIdx === correctIndex);
  };

  const handleReset = () => {
    setSubmitted(false);
    setSelectedIdx(null);
    setIsCorrect(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rewardCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="via-card to-card space-y-5 rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/5 p-4 text-left sm:p-6">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          <HelpCircle className="size-3.5" />
          <span>Thử Thách Trả Lời Câu Hỏi</span>
        </div>
        <span className="text-muted-foreground text-xs font-medium">
          Phần thưởng: {rewardDiscount}
        </span>
      </div>

      <div className="space-y-2">
        <h3 className="text-foreground text-base font-bold sm:text-lg">{question}</h3>
        <p className="text-muted-foreground text-xs">
          Hãy chọn 1 đáp án chính xác nhất bên dưới để nhận ngay Voucher đặc quyền!
        </p>
      </div>

      {/* DANH SÁCH ĐÁP ÁN */}
      <div className="space-y-2.5">
        {options.map((opt, i) => {
          const isSelected = selectedIdx === i;
          let btnStyle = 'border-border/80 bg-background hover:border-primary/50';

          if (submitted) {
            if (i === correctIndex) {
              btnStyle =
                'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold';
            } else if (isSelected && !isCorrect) {
              btnStyle =
                'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400 line-through';
            } else {
              btnStyle = 'border-border/40 opacity-50';
            }
          } else if (isSelected) {
            btnStyle =
              'border-primary bg-primary/10 text-primary font-semibold ring-2 ring-primary/20';
          }

          const letters = ['A', 'B', 'C', 'D'];

          return (
            <button
              key={i}
              type="button"
              disabled={submitted}
              onClick={() => setSelectedIdx(i)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition-all sm:p-3.5 ${btnStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className="bg-muted text-foreground flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                  {letters[i]}
                </span>
                <span className="leading-snug">{opt}</span>
              </div>
              {submitted && i === correctIndex && (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              )}
              {submitted && isSelected && !isCorrect && (
                <XCircle className="size-4 shrink-0 text-rose-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* NÚT THAO TÁC */}
      {!submitted ? (
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={selectedIdx === null}
          className="h-11 w-full text-sm font-semibold shadow-xs"
        >
          Gửi câu trả lời
        </Button>
      ) : (
        <div className="space-y-4 pt-2">
          {isCorrect ? (
            <div className="animate-in zoom-in-95 space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 sm:text-base dark:text-emerald-400">
                <Gift className="size-5 shrink-0" />
                <span>Xuất sắc! Bạn đã trả lời hoàn toàn chính xác.</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Tặng bạn mã ưu đãi {rewardDiscount} áp dụng khi mua sản phẩm hoặc khóa học:
              </p>
              <div className="flex items-center gap-2">
                <div className="bg-background rounded-lg border border-dashed border-emerald-500 px-4 py-2 font-mono text-base font-black tracking-wider text-emerald-600 dark:text-emerald-400">
                  {rewardCode}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 size-4 text-emerald-500" />
                      Đã chép
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 size-4" />
                      Sao chép
                    </>
                  )}
                </Button>
              </div>
              <div className="pt-1">
                <Link
                  href="/shop"
                  className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                >
                  Đến Shop để áp dụng mã ngay <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in space-y-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                Rất tiếc! Đáp án bạn chọn chưa chính xác.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs"
              >
                Thử trả lời lại
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
