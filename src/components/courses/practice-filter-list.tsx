'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Code2,
  ListChecks,
  Volume2,
  Video,
  FileText,
  Image as ImageIcon,
  Search,
  SlidersHorizontal,
  ArrowRight,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { PracticeExerciseListItem } from '@/server/actions/practice';

interface PracticeFilterListProps {
  initialExercises: PracticeExerciseListItem[];
  isAdmin?: boolean;
}

export function PracticeFilterList({ initialExercises }: PracticeFilterListProps) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'CODE' | 'QUIZ'>('ALL');
  const [selectedMedia, setSelectedMedia] = useState<'ALL' | 'AUDIO' | 'VIDEO' | 'PASSAGE'>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Lấy danh sách các chuyên mục
  const categories = useMemo(() => {
    const set = new Set<string>();
    initialExercises.forEach((e) => {
      if (e.category?.trim()) set.add(e.category.trim());
    });
    return Array.from(set);
  }, [initialExercises]);

  // Bộ lọc
  const filtered = useMemo(() => {
    return initialExercises.filter((e) => {
      if (selectedType !== 'ALL' && e.type !== selectedType) return false;
      if (selectedDifficulty !== 'ALL' && e.difficulty !== selectedDifficulty) return false;
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;
      if (selectedMedia === 'AUDIO' && !e.hasAudio) return false;
      if (selectedMedia === 'VIDEO' && !e.hasVideo) return false;
      if (selectedMedia === 'PASSAGE' && !e.hasPassage) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchCat = (e.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat) return false;
      }
      return true;
    });
  }, [initialExercises, selectedType, selectedMedia, selectedDifficulty, selectedCategory, search]);

  const stats = useMemo(() => {
    const total = initialExercises.length;
    const codeCount = initialExercises.filter((e) => e.type === 'CODE').length;
    const quizCount = initialExercises.filter((e) => e.type === 'QUIZ').length;
    const audioCount = initialExercises.filter((e) => e.hasAudio).length;
    const videoCount = initialExercises.filter((e) => e.hasVideo).length;
    const passageCount = initialExercises.filter((e) => e.hasPassage).length;
    return { total, codeCount, quizCount, audioCount, videoCount, passageCount };
  }, [initialExercises]);

  const hasFilterActive =
    search.trim() !== '' ||
    selectedType !== 'ALL' ||
    selectedMedia !== 'ALL' ||
    selectedDifficulty !== 'ALL' ||
    selectedCategory !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setSelectedType('ALL');
    setSelectedMedia('ALL');
    setSelectedDifficulty('ALL');
    setSelectedCategory('ALL');
  };

  return (
    <div className="space-y-6">
      {/* THẺ THỐNG KÊ KHO HỌC LIỆU & ĐỀ THI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="border-border bg-card rounded-xl border p-3.5 shadow-xs">
          <p className="text-muted-foreground text-xs font-medium">Tổng số bài tập</p>
          <p className="text-foreground mt-1 text-2xl font-extrabold">{stats.total}</p>
        </div>
        <div className="border-info/20 bg-info/5 rounded-xl border p-3.5 shadow-xs">
          <div className="text-info flex items-center gap-1.5 text-xs font-medium">
            <Code2 className="size-3.5" /> Bài Code
          </div>
          <p className="text-info mt-1 text-2xl font-extrabold">{stats.codeCount}</p>
        </div>
        <div className="border-primary/20 bg-primary/5 rounded-xl border p-3.5 shadow-xs">
          <div className="text-primary flex items-center gap-1.5 text-xs font-medium">
            <ListChecks className="size-3.5" /> Trắc nghiệm
          </div>
          <p className="text-primary mt-1 text-2xl font-extrabold">{stats.quizCount}</p>
        </div>
        <div className="border-info/20 bg-info/5 rounded-xl border p-3.5 shadow-xs">
          <div className="text-info flex items-center gap-1.5 text-xs font-medium">
            <Volume2 className="size-3.5" /> Có âm thanh
          </div>
          <p className="text-info mt-1 text-2xl font-extrabold">{stats.audioCount}</p>
        </div>
        <div className="border-destructive/20 bg-destructive/5 rounded-xl border p-3.5 shadow-xs">
          <div className="text-destructive flex items-center gap-1.5 text-xs font-medium">
            <Video className="size-3.5" /> Có Video
          </div>
          <p className="text-destructive mt-1 text-2xl font-extrabold">{stats.videoCount}</p>
        </div>
        <div className="border-warning/20 bg-warning/5 rounded-xl border p-3.5 shadow-xs">
          <div className="text-warning flex items-center gap-1.5 text-xs font-medium">
            <FileText className="size-3.5" /> Đoạn văn bản
          </div>
          <p className="text-warning mt-1 text-2xl font-extrabold">{stats.passageCount}</p>
        </div>
      </div>

      {/* KHUNG BỘ LỌC TƯƠNG TÁC */}
      <section
        aria-label="Bộ lọc kho đề thi"
        className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-xs sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-primary size-4" />
            <h2 className="text-foreground text-sm font-bold">Bộ lọc bài tập & Học liệu</h2>
          </div>
          {hasFilterActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground h-8 cursor-pointer text-xs"
            >
              <RotateCcw className="mr-1 size-3.5" /> Đặt lại bộ lọc
            </Button>
          )}
        </div>

        {/* Thanh tìm kiếm & Dropdown */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên bài tập, chủ đề, thuật toán..."
              className="h-10 pl-9 text-xs sm:text-sm"
            />
          </div>

          <div>
            <Select
              value={selectedDifficulty}
              fullWidth
              onChange={(val) => setSelectedDifficulty(val)}
              options={[
                { value: 'ALL', label: 'Mọi độ khó' },
                { value: 'EASY', label: '🟢 Dễ (Easy)' },
                { value: 'MEDIUM', label: '🟡 Trung bình (Medium)' },
                { value: 'HARD', label: '🔴 Nâng cao (Hard)' },
              ]}
              aria-label="Độ khó"
            />
          </div>

          {categories.length > 0 && (
            <div>
              <Select
                value={selectedCategory}
                fullWidth
                onChange={(val) => setSelectedCategory(val)}
                options={[
                  { value: 'ALL', label: 'Mọi chuyên mục' },
                  ...categories.map((cat) => ({
                    value: cat,
                    label: cat,
                  })),
                ]}
                aria-label="Chuyên mục"
              />
            </div>
          )}
        </div>

        {/* Nút lọc nhanh: Dạng bài tập */}
        <div className="border-border/50 space-y-2 border-t pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground mr-1 text-xs font-semibold">Dạng bài:</span>
            {[
              { id: 'ALL', label: 'Tất cả dạng bài' },
              { id: 'CODE', label: '💻 Lập trình (Code & Test cases)' },
              { id: 'QUIZ', label: '📝 Trắc nghiệm & Ngữ liệu' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id as 'ALL' | 'CODE' | 'QUIZ')}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  selectedType === tab.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Lọc theo tài nguyên học liệu đính kèm */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-muted-foreground mr-1 text-xs font-semibold">Kho học liệu:</span>
            {[
              { id: 'ALL' as const, label: 'Tất cả' },
              { id: 'AUDIO' as const, label: '🎧 Có âm thanh / Audio' },
              { id: 'VIDEO' as const, label: '🎬 Có video hướng dẫn' },
              { id: 'PASSAGE' as const, label: '📖 Có đoạn văn đọc hiểu' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMedia(m.id)}
                className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  selectedMedia === m.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* DANH SÁCH BÀI TẬP (GRID) */}
      {filtered.length === 0 ? (
        <div className="border-border bg-card/40 space-y-3 rounded-2xl border border-dashed p-12 text-center">
          <BookOpen className="text-muted-foreground/60 mx-auto size-10" />
          <h3 className="text-foreground text-base font-bold">Không tìm thấy bài tập phù hợp</h3>
          <p className="text-muted-foreground mx-auto max-w-md text-xs">
            {hasFilterActive
              ? 'Hãy thử thay đổi điều kiện lọc hoặc xóa từ khóa tìm kiếm.'
              : 'Hiện tại chưa có bài tập mở nào trong kho. Admin có thể đăng bài tập mới tại trang quản trị.'}
          </p>
          {hasFilterActive && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs">
              Xóa bộ lọc
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const isCode = item.type === 'CODE';
            const diffColor =
              item.difficulty === 'EASY'
                ? 'bg-success/10 text-success border-success/20'
                : item.difficulty === 'HARD'
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : 'bg-warning/10 text-warning border-warning/20';

            const diffText =
              item.difficulty === 'EASY'
                ? 'Dễ'
                : item.difficulty === 'HARD'
                  ? 'Nâng cao'
                  : 'Trung bình';

            return (
              <div
                key={item.id}
                className="group border-border bg-card hover:border-primary/50 flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Badges đầu thẻ */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                          isCode ? 'bg-info/10 text-info' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {isCode ? (
                          <>
                            <Code2 className="size-3.5" /> Lập trình
                          </>
                        ) : (
                          <>
                            <ListChecks className="size-3.5" /> Trắc nghiệm
                          </>
                        )}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${diffColor}`}
                      >
                        {diffText}
                      </span>
                    </div>

                    <span className="bg-success/15 text-success rounded-md px-2 py-0.5 text-[10px] font-bold">
                      Miễn phí 100%
                    </span>
                  </div>

                  {/* Tiêu đề & Chuyên mục */}
                  <div className="space-y-1">
                    {item.category && (
                      <p className="text-primary text-[11px] font-semibold tracking-wider uppercase">
                        {item.category}
                      </p>
                    )}
                    <h3 className="text-foreground group-hover:text-primary line-clamp-2 text-base leading-snug font-bold transition-colors">
                      {item.title}
                    </h3>
                  </div>

                  {/* Tags kho học liệu đính kèm */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {item.hasAudio && (
                      <span className="bg-info/10 text-info inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium">
                        <Volume2 className="size-3" /> Audio
                      </span>
                    )}
                    {item.hasVideo && (
                      <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium">
                        <Video className="size-3" /> Video
                      </span>
                    )}
                    {item.hasPassage && (
                      <span className="bg-warning/10 text-warning inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium">
                        <FileText className="size-3" /> Đoạn văn
                      </span>
                    )}
                    {item.hasImage && (
                      <span className="bg-success/10 text-success inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium">
                        <ImageIcon className="size-3" /> Hình ảnh
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer thẻ */}
                <div className="border-border/60 mt-5 flex items-center justify-between border-t pt-3.5 text-xs">
                  <div className="text-muted-foreground">
                    {isCode ? (
                      <span>{item.testCasesCount} bộ test kiểm thử</span>
                    ) : (
                      <span>{item.questionsCount} câu hỏi trắc nghiệm</span>
                    )}
                  </div>

                  <Link
                    href={`/courses/practice/${item.id}`}
                    className="text-primary inline-flex items-center gap-1 font-bold transition-transform group-hover:translate-x-0.5 hover:underline"
                  >
                    <span>Làm bài</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
