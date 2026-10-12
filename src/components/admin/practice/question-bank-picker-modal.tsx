'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  CheckSquare,
  Square,
  ListChecks,
  CheckCircle2,
  X,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { BankQuestionItem } from '@/server/actions/practice';
import type { QuizQuestion } from '@/lib/courses/quiz';

interface QuestionBankPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankQuestions: BankQuestionItem[];
  onSelectQuestions: (questions: QuizQuestion[]) => void;
}

export function QuestionBankPickerModal({
  isOpen,
  onClose,
  bankQuestions,
  onSelectQuestions,
}: QuestionBankPickerModalProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Danh mục duy nhất có trong ngân hàng
  const categories = useMemo(() => {
    const set = new Set<string>();
    bankQuestions.forEach((q) => {
      if (q.category?.trim()) set.add(q.category.trim());
    });
    return Array.from(set);
  }, [bankQuestions]);

  // Lọc câu hỏi theo từ khóa và danh mục
  const filteredQuestions = useMemo(() => {
    return bankQuestions.filter((q) => {
      const matchCategory = categoryFilter === 'ALL' || q.category?.trim() === categoryFilter;
      if (!matchCategory) return false;

      if (!search.trim()) return true;
      const query = search.toLowerCase().trim();
      return (
        q.prompt.toLowerCase().includes(query) ||
        (q.exerciseTitle && q.exerciseTitle.toLowerCase().includes(query)) ||
        (q.explanation && q.explanation.toLowerCase().includes(query)) ||
        q.options?.some((opt) => opt.text.toLowerCase().includes(query))
      );
    });
  }, [bankQuestions, search, categoryFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  const handleConfirmAdd = () => {
    const selected = bankQuestions.filter((q) => selectedIds.has(q.id));
    if (selected.length === 0) return;

    // Nhân bản câu hỏi với ID mới để tránh xung đột
    const clonedQuestions: QuizQuestion[] = selected.map((q) => {
      const newQuestionId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return {
        id: newQuestionId,
        type: q.type,
        prompt: q.prompt,
        options: q.options?.map((opt, idx) => ({
          id: `opt-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
          text: opt.text,
          isCorrect: Boolean(opt.isCorrect),
        })),
        acceptableAnswers: q.acceptableAnswers ? [...q.acceptableAnswers] : undefined,
        explanation: q.explanation || '',
      };
    });

    onSelectQuestions(clonedQuestions);
    setSelectedIds(new Set());
    onClose();
  };

  if (!isOpen) return null;

  const isAllFilteredSelected =
    filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedIds.has(q.id));

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm duration-200 sm:p-5">
      <div className="border-border bg-card flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        {/* MODAL HEADER */}
        <div className="border-border flex items-center justify-between border-b p-4 sm:px-6">
          <div>
            <h2 className="text-foreground flex items-center gap-2 text-base font-bold sm:text-lg">
              Ngân hàng Câu hỏi Trắc nghiệm
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
                {bankQuestions.length} câu trong kho
              </span>
            </h2>
            <p className="text-muted-foreground text-xs">
              Duyệt và chọn câu hỏi có sẵn từ các đề thi khác để thêm vào đề này.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-lg p-2 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="border-border/80 bg-muted/20 space-y-3 border-b p-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search input */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm nội dung câu hỏi, đáp án, hoặc đề thi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border bg-background focus:ring-primary/20 w-full rounded-xl border py-2 pr-3 pl-9 text-xs focus:ring-2 focus:outline-none sm:text-sm"
              />
            </div>

            {/* Category filter */}
            {categories.length > 0 && (
              <Select
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                options={[
                  { value: 'ALL', label: 'Tất cả chuyên mục' },
                  ...categories.map((cat) => ({
                    value: cat,
                    label: cat,
                  })),
                ]}
              />
            )}

            {/* Select all toggle button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllFiltered}
              className="cursor-pointer gap-1.5 text-xs font-semibold"
            >
              {isAllFilteredSelected ? (
                <>
                  <CheckSquare className="text-primary size-3.5" /> Bỏ chọn tất cả
                </>
              ) : (
                <>
                  <Square className="text-muted-foreground size-3.5" /> Chọn tất cả (
                  {filteredQuestions.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* QUESTIONS LIST */}
        <div className="divide-border/40 flex-1 space-y-3 divide-y overflow-y-auto p-4 sm:p-6">
          {filteredQuestions.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center space-y-2 py-12 text-center">
              <ListChecks className="text-muted-foreground/60 size-10 stroke-[1.5]" />
              <p className="text-sm font-semibold">Không tìm thấy câu hỏi nào</p>
              <p className="max-w-sm text-xs">
                {bankQuestions.length === 0
                  ? 'Kho hiện chưa có câu hỏi trắc nghiệm nào từ các đề khác. Bạn có thể tự nhập câu hỏi hoặc import từ file Word / MDX.'
                  : 'Không có câu hỏi nào khớp với từ khóa tìm kiếm hoặc chuyên mục đã chọn.'}
              </p>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const isSelected = selectedIds.has(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => toggleSelect(q.id)}
                  className={`cursor-pointer rounded-xl border p-3 pt-3 transition-all first:pt-0 sm:p-4 ${
                    isSelected
                      ? 'border-primary/60 bg-primary/5 shadow-xs'
                      : 'border-border/60 bg-card hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 pt-0.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(q.id)}
                        className="accent-primary size-4.5 cursor-pointer rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      {/* Origin & Meta badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-foreground font-bold">
                          {q.type === 'SINGLE'
                            ? 'Trắc nghiệm 1 đáp án'
                            : q.type === 'MULTIPLE'
                              ? 'Nhiều đáp án'
                              : 'Điền từ'}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span
                          className="bg-muted text-muted-foreground max-w-xs truncate rounded px-2 py-0.5 font-medium"
                          title={q.exerciseTitle}
                        >
                          Từ đề: {q.exerciseTitle}
                        </span>
                        {q.category && (
                          <span className="bg-primary/10 text-primary rounded px-2 py-0.5 font-semibold">
                            {q.category}
                          </span>
                        )}
                      </div>

                      {/* Question prompt */}
                      <p className="text-foreground text-sm leading-relaxed font-semibold whitespace-pre-wrap">
                        {q.prompt}
                      </p>

                      {/* Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid gap-1.5 pt-1 sm:grid-cols-2">
                          {q.options.map((opt, oIndex) => {
                            const label = String.fromCharCode(65 + oIndex);
                            return (
                              <div
                                key={opt.id}
                                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                                  opt.isCorrect
                                    ? 'border-success/40 bg-success/10 text-success font-medium'
                                    : 'border-border/60 bg-background/60 text-muted-foreground'
                                }`}
                              >
                                <span className="shrink-0 font-bold">{label}.</span>
                                <span className="flex-1 truncate">{opt.text}</span>
                                {opt.isCorrect && (
                                  <CheckCircle2 className="text-success size-3.5 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="bg-muted/40 text-muted-foreground flex items-start gap-1.5 rounded-lg p-2 text-[11px]">
                          <HelpCircle className="text-warning mt-0.5 size-3.5 shrink-0" />
                          <span className="line-clamp-2">
                            <strong className="text-foreground">Giải thích:</strong> {q.explanation}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="border-border bg-card flex items-center justify-between border-t p-3 sm:px-6">
          <div className="text-foreground text-xs font-medium sm:text-sm">
            Đã chọn: <span className="text-primary font-bold">{selectedIds.size}</span> câu hỏi
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="cursor-pointer text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmAdd}
              disabled={selectedIds.size === 0}
              className="cursor-pointer gap-1.5 text-xs font-bold"
            >
              <ListChecks className="size-3.5" /> Thêm {selectedIds.size} câu hỏi vào đề
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
