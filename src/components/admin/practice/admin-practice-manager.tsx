'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Code2,
  ListChecks,
  Plus,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  FileCode,
  Edit3,
  Trash2,
  BookOpen,
  Volume2,
  Video,
  Image as ImageIcon,
  Search,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExerciseDocumentImportModal } from '@/components/admin/practice/exercise-document-import-modal';
import { CreateMaterialModal } from '@/components/admin/practice/create-material-modal';
import { CreateQuestionModal } from '@/components/admin/practice/create-question-modal';
import {
  toggleExercisePractice,
  createStandalonePracticeExercise,
  seedSamplePracticeExercises,
  deletePracticeExercise,
  type BankMaterialItem,
  type BankQuestionItem,
} from '@/server/actions/practice';

interface ExerciseBankItem {
  id: string;
  title: string;
  type: 'CODE' | 'QUIZ';
  isPublicPractice: boolean;
  category: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  hasPassage: boolean;
  hasAudio: boolean;
  hasImage: boolean;
  hasVideo: boolean;
  questionsCount: number;
  testCasesCount: number;
  submissionCount: number;
  courseTitle: string;
  lessonTitle: string;
  createdAt: Date;
}

export function AdminPracticeManager({
  initialExercises,
  materials = [],
  bankQuestions = [],
}: {
  initialExercises: ExerciseBankItem[];
  materials?: BankMaterialItem[];
  bankQuestions?: BankQuestionItem[];
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [activeTab, setActiveTab] = useState<'EXERCISES' | 'MATERIALS' | 'QUESTIONS'>('EXERCISES');

  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false);
  const [isCreateQuestionOpen, setIsCreateQuestionOpen] = useState(false);

  // Search states for tabs
  const [materialSearch, setMaterialSearch] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  const filteredMaterials = useMemo(() => {
    if (!materialSearch.trim()) return materials;
    const q = materialSearch.toLowerCase().trim();
    return materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.passage && m.passage.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)),
    );
  }, [materials, materialSearch]);

  const filteredQuestions = useMemo(() => {
    if (!questionSearch.trim()) return bankQuestions;
    const q = questionSearch.toLowerCase().trim();
    return bankQuestions.filter(
      (item) =>
        item.prompt.toLowerCase().includes(q) ||
        (item.exerciseTitle && item.exerciseTitle.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)),
    );
  }, [bankQuestions, questionSearch]);

  const handleTogglePractice = (id: string, currentStatus: boolean) => {
    setLoadingId(id);
    startTransition(async () => {
      try {
        const res = await toggleExercisePractice(id, !currentStatus);
        if (res.ok) {
          setExercises((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, isPublicPractice: !currentStatus } : item,
            ),
          );
          setMessage({
            tone: 'ok',
            text: !currentStatus
              ? 'Đã bật hiển thị bài tập trên trang Luyện đề miễn phí!'
              : 'Đã ẩn bài tập khỏi trang Luyện đề.',
          });
        }
      } catch (err: unknown) {
        setMessage({ tone: 'bad', text: err instanceof Error ? err.message : 'Có lỗi xảy ra.' });
      } finally {
        setLoadingId(null);
      }
    });
  };

  const handleCreateExercise = (type: 'CODE' | 'QUIZ') => {
    startTransition(async () => {
      try {
        const res = await createStandalonePracticeExercise(type);
        if (res.ok && res.data?.id) {
          router.push(`/admin/practice/${res.data.id}`);
        } else {
          router.refresh();
        }
      } catch (err: unknown) {
        setMessage({ tone: 'bad', text: err instanceof Error ? err.message : 'Lỗi tạo bài tập.' });
      }
    });
  };

  const handleDeleteExercise = (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${title}" khỏi kho bài tập?`)) return;
    startTransition(async () => {
      try {
        const res = await deletePracticeExercise(id);
        if (res.ok) {
          setExercises((prev) => prev.filter((item) => item.id !== id));
          setMessage({ tone: 'ok', text: `Đã xóa bài tập "${title}" thành công!` });
        }
      } catch (err: unknown) {
        setMessage({ tone: 'bad', text: err instanceof Error ? err.message : 'Lỗi xóa bài tập.' });
      }
    });
  };

  const handleSeedSamples = () => {
    if (
      !confirm('Tạo các bài tập mẫu thực chiến (TOEIC Audio, Thuật toán Video, Đoạn văn đọc hiểu)?')
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await seedSamplePracticeExercises();
        if (res.ok) {
          setMessage({
            tone: 'ok',
            text: 'Đã nạp thành công các bài tập mẫu đầy đủ Audio, Video, Đoạn văn và Code!',
          });
          router.refresh();
        }
      } catch (err: unknown) {
        setMessage({
          tone: 'bad',
          text: err instanceof Error ? err.message : 'Lỗi nạp bài tập mẫu.',
        });
      }
    });
  };

  const stats = {
    total: exercises.length,
    publicCount: exercises.filter((e) => e.isPublicPractice).length,
    codeCount: exercises.filter((e) => e.type === 'CODE').length,
    quizCount: exercises.filter((e) => e.type === 'QUIZ').length,
    materialCount: materials.length,
    questionCount: bankQuestions.length,
  };

  return (
    <div className="space-y-6">
      {/* THÔNG BÁO */}
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

      {/* THẺ THỐNG KÊ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border-border bg-card rounded-xl border p-4 shadow-xs">
          <p className="text-muted-foreground text-xs font-medium">Tổng đề thi</p>
          <p className="text-foreground mt-1 text-2xl font-extrabold">{stats.total}</p>
        </div>
        <div className="border-success/20 bg-success/5 rounded-xl border p-4 shadow-xs">
          <p className="text-success text-xs font-medium">Mở Luyện đề Free</p>
          <p className="text-success mt-1 text-2xl font-extrabold">{stats.publicCount}</p>
        </div>
        <div className="border-primary/20 bg-primary/5 rounded-xl border p-4 shadow-xs">
          <p className="text-primary text-xs font-medium">Kho Ngữ liệu có sẵn</p>
          <p className="text-primary mt-1 text-2xl font-extrabold">{stats.materialCount}</p>
        </div>
        <div className="border-info/20 bg-info/5 rounded-xl border p-4 shadow-xs">
          <p className="text-info text-xs font-medium">Ngân hàng câu hỏi</p>
          <p className="text-info mt-1 text-2xl font-extrabold">{stats.questionCount}</p>
        </div>
      </div>

      {/* THANH CÔNG CỤ TẠO ĐỀ & ĐIỀU HƯỚNG */}
      <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút lớn: Tạo đề thi mới -> vào trang /admin/practice/new */}
          <Link
            href="/admin/practice/new"
            className="bg-primary text-primary-foreground inline-flex items-center rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm transition hover:opacity-90"
          >
            Tạo đề thi mới
          </Link>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleCreateExercise('CODE')}
            disabled={isPending}
            className="cursor-pointer text-xs font-semibold"
          >
            Tạo đề Lập trình
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleCreateExercise('QUIZ')}
            disabled={isPending}
            className="cursor-pointer text-xs font-semibold"
          >
            Tạo đề Trắc nghiệm
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            disabled={isPending}
            className="border-primary/30 text-primary hover:bg-primary/10 cursor-pointer text-xs font-semibold"
          >
            Nhập từ Word / MDX
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSeedSamples}
            disabled={isPending}
            className="cursor-pointer text-xs font-semibold"
            title="Tạo các bài tập mẫu TOEIC Audio, Thuật toán Video, Đoạn văn đọc hiểu"
          >
            Nạp đề mẫu
          </Button>
        </div>

        <Link
          href="/courses/practice"
          target="_blank"
          className="text-primary text-xs font-bold hover:underline"
        >
          Xem trang Luyện đề người dùng
        </Link>
      </div>

      {/* TABS CHUYỂN ĐỔI: ĐỀ THI / KHO NGỮ LIỆU / NGÂN HÀNG CÂU HỎI */}
      <div className="border-border flex gap-2 border-b text-xs font-semibold sm:text-sm">
        <button
          type="button"
          onClick={() => setActiveTab('EXERCISES')}
          className={`cursor-pointer border-b-2 px-3 pb-3 transition ${
            activeTab === 'EXERCISES'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          }`}
        >
          Danh sách Đề thi ({exercises.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MATERIALS')}
          className={`cursor-pointer border-b-2 px-3 pb-3 transition ${
            activeTab === 'MATERIALS'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          }`}
        >
          Kho Ngữ Liệu Học Liệu ({materials.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('QUESTIONS')}
          className={`cursor-pointer border-b-2 px-3 pb-3 transition ${
            activeTab === 'QUESTIONS'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          }`}
        >
          Ngân Hàng Câu Hỏi ({bankQuestions.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DANH SÁCH ĐỀ THI & BÀI TẬP                         */}
      {/* ========================================================= */}
      {activeTab === 'EXERCISES' && (
        <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-border bg-muted/40 text-muted-foreground border-b font-semibold">
                <tr>
                  <th className="px-4 py-3">Tên bài tập & Chuyên mục</th>
                  <th className="px-4 py-3">Dạng bài</th>
                  <th className="px-4 py-3">Kho học liệu</th>
                  <th className="px-4 py-3">Nguồn gốc</th>
                  <th className="px-4 py-3 text-center">Trạng thái Luyện đề</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-border/60 divide-y">
                {exercises.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground py-10 text-center">
                      Chưa có bài tập nào trong kho. Hãy bấm &quot;Tạo đề thi mới&quot; hoặc
                      &quot;Nạp đề mẫu&quot; ở trên.
                    </td>
                  </tr>
                ) : (
                  exercises.map((item) => {
                    const isCode = item.type === 'CODE';
                    const isOperating = loadingId === item.id;

                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        {/* Tiêu đề */}
                        <td className="max-w-xs px-4 py-3.5 font-medium">
                          <p className="text-foreground line-clamp-1 text-sm font-bold">
                            {item.title}
                          </p>
                          {item.category && (
                            <span className="text-muted-foreground text-[11px]">
                              Chuyên mục: {item.category}
                            </span>
                          )}
                        </td>

                        {/* Dạng bài */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                              isCode ? 'bg-info/10 text-info' : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {isCode ? 'Code' : 'Trắc nghiệm'}
                          </span>
                        </td>

                        {/* Học liệu đính kèm */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {item.hasAudio && (
                              <span
                                className="bg-info/10 text-info rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                title="Có âm thanh Audio"
                              >
                                Audio
                              </span>
                            )}
                            {item.hasVideo && (
                              <span
                                className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                title="Có video hướng dẫn"
                              >
                                Video
                              </span>
                            )}
                            {item.hasPassage && (
                              <span
                                className="bg-warning/10 text-warning rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                title="Có đoạn văn ngữ liệu"
                              >
                                Đoạn văn
                              </span>
                            )}
                            {item.hasImage && (
                              <span
                                className="bg-success/10 text-success rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                title="Có hình ảnh"
                              >
                                Hình ảnh
                              </span>
                            )}
                            {!item.hasAudio &&
                              !item.hasVideo &&
                              !item.hasPassage &&
                              !item.hasImage && (
                                <span className="text-muted-foreground/60 text-[11px] italic">
                                  Chỉ có đề bài
                                </span>
                              )}
                          </div>
                        </td>

                        {/* Nguồn bài học */}
                        <td className="text-muted-foreground px-4 py-3.5 text-xs">
                          <p className="line-clamp-1">{item.courseTitle}</p>
                          <p className="line-clamp-1 text-[11px]">{item.lessonTitle}</p>
                        </td>

                        {/* Công tắc Bật/Tắt Luyện đề Free */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePractice(item.id, item.isPublicPractice)}
                            disabled={isOperating || isPending}
                            className={`inline-flex cursor-pointer items-center justify-center rounded-full px-3 py-1 text-xs font-bold transition ${
                              item.isPublicPractice
                                ? 'bg-success/15 text-success hover:bg-success/25'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {isOperating ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : item.isPublicPractice ? (
                              <span>Đang MỞ FREE</span>
                            ) : (
                              <span>Đang ĐÓNG</span>
                            )}
                          </button>
                        </td>

                        {/* Thao tác */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                            <Link
                              href={`/admin/practice/${item.id}`}
                              className="border-border bg-background text-foreground hover:bg-muted inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold transition"
                            >
                              <span>Soạn đề</span>
                            </Link>
                            <Link
                              href={`/courses/practice/${item.id}`}
                              target="_blank"
                              className="border-border/70 text-primary hover:bg-primary/5 inline-flex items-center rounded-lg border px-2 py-1 text-xs font-semibold transition"
                            >
                              <span>Làm thử ↗</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDeleteExercise(item.id, item.title)}
                              disabled={isPending}
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive inline-flex cursor-pointer items-center rounded-lg px-2 py-1 text-xs font-medium transition"
                              title="Xóa đề này"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: KHO HỌC LIỆU & NGỮ LIỆU ĐA PHƯƠNG TIỆN             */}
      {/* ========================================================= */}
      {activeTab === 'MATERIALS' && (
        <div className="space-y-4">
          <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-xs">
            <div className="relative min-w-[240px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm bài đọc hiểu, audio, video trong kho ngữ liệu..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="border-border bg-background w-full rounded-xl border py-2 pr-3 pl-9 text-xs focus:outline-none sm:text-sm"
              />
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsCreateMaterialOpen(true)}
              className="cursor-pointer text-xs font-bold"
            >
              + Thêm ngữ liệu vào kho
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {filteredMaterials.length === 0 ? (
              <div className="border-border text-muted-foreground space-y-2 rounded-2xl border border-dashed p-12 text-center sm:col-span-2">
                <p className="text-sm font-semibold">Chưa có ngữ liệu nào trong kho</p>
                <p className="text-xs">
                  Bấm &quot;+ Thêm ngữ liệu vào kho&quot; để tạo bài đọc, âm thanh hoặc video mới.
                </p>
              </div>
            ) : (
              filteredMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="border-border/80 bg-card hover:border-primary/40 space-y-3 rounded-2xl border p-4 shadow-xs transition"
                >
                  <div className="border-border/60 flex items-start justify-between gap-2 border-b pb-2">
                    <div>
                      <h3 className="text-foreground line-clamp-1 text-sm font-bold">
                        {mat.title}
                      </h3>
                      <div className="text-muted-foreground flex items-center gap-1.5 pt-0.5 text-[11px]">
                        {mat.category && (
                          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 font-semibold">
                            {mat.category}
                          </span>
                        )}
                        <span>• {mat.sourceExerciseTitle}</span>
                      </div>
                    </div>

                    <Link
                      href={`/admin/practice/new`}
                      className="text-primary inline-flex items-center gap-1 text-[11px] font-bold hover:underline"
                    >
                      Dùng tạo đề ↗
                    </Link>
                  </div>

                  {mat.passage && (
                    <div className="border-border/60 bg-muted/20 rounded-xl border p-2.5">
                      <span className="text-muted-foreground text-[10px] font-bold">
                        Đoạn văn bài đọc:
                      </span>
                      <p className="text-foreground/80 mt-1 line-clamp-3 text-xs leading-relaxed whitespace-pre-wrap">
                        {mat.passage}
                      </p>
                    </div>
                  )}

                  {mat.audioUrl && (
                    <div className="border-info/20 bg-info/5 flex items-center gap-2 rounded-xl border p-2">
                      <span className="text-info shrink-0 text-[11px] font-bold">Audio:</span>
                      <audio controls src={mat.audioUrl} className="h-7 flex-1" />
                    </div>
                  )}

                  <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
                    {mat.videoUrl && <span className="text-destructive font-medium">Có video</span>}
                    {mat.imageUrl && <span className="text-success font-medium">Có ảnh</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM                      */}
      {/* ========================================================= */}
      {activeTab === 'QUESTIONS' && (
        <div className="space-y-4">
          <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-xs">
            <div className="relative min-w-[240px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm nội dung câu hỏi trong ngân hàng..."
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                className="border-border bg-background w-full rounded-xl border py-2 pr-3 pl-9 text-xs focus:outline-none sm:text-sm"
              />
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsCreateQuestionOpen(true)}
              className="cursor-pointer text-xs font-bold"
            >
              + Thêm câu hỏi vào ngân hàng
            </Button>
          </div>

          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="border-border text-muted-foreground space-y-2 rounded-2xl border border-dashed p-12 text-center">
                <p className="text-sm font-semibold">Chưa có câu hỏi nào trong ngân hàng</p>
                <p className="text-xs">
                  Bấm &quot;+ Thêm câu hỏi vào ngân hàng&quot; hoặc import từ file Word/MDX.
                </p>
              </div>
            ) : (
              filteredQuestions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="border-border bg-card space-y-2.5 rounded-2xl border p-4 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-bold">
                        {q.type === 'SINGLE' ? 'Trắc nghiệm 1 đáp án' : 'Nhiều đáp án'}
                      </span>
                      {q.category && (
                        <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-[11px] font-semibold">
                          {q.category}
                        </span>
                      )}
                      <span className="text-muted-foreground text-[11px]">
                        Từ đề: {q.exerciseTitle}
                      </span>
                    </div>
                  </div>

                  <p className="text-foreground text-sm leading-relaxed font-semibold whitespace-pre-wrap">
                    {q.prompt}
                  </p>

                  {q.options && q.options.length > 0 && (
                    <div className="grid gap-1.5 pt-1 sm:grid-cols-2">
                      {q.options.map((opt, oIdx) => {
                        const optLabel = String.fromCharCode(65 + oIdx);
                        return (
                          <div
                            key={opt.id || oIdx}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${
                              opt.isCorrect
                                ? 'border-success/50 bg-success/10 text-success font-semibold'
                                : 'border-border/60 bg-muted/10 text-muted-foreground'
                            }`}
                          >
                            <span className="font-bold">{optLabel}.</span>
                            <span className="flex-1 truncate">{opt.text}</span>
                            {opt.isCorrect && <span className="text-success font-bold">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="bg-muted/30 text-muted-foreground rounded-xl p-2 text-[11px]">
                      <strong className="text-foreground">Giải thích:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL NHẬP FILE WORD / MDX */}
      <ExerciseDocumentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* MODAL THÊM NGỮ LIỆU MỚI VÀO KHO */}
      <CreateMaterialModal
        isOpen={isCreateMaterialOpen}
        onClose={() => setIsCreateMaterialOpen(false)}
      />

      {/* MODAL THÊM CÂU HỎI MỚI VÀO NGÂN HÀNG */}
      <CreateQuestionModal
        isOpen={isCreateQuestionOpen}
        onClose={() => setIsCreateQuestionOpen(false)}
      />
    </div>
  );
}
