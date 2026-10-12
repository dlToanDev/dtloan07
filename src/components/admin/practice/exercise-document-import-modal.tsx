'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Code2,
  ListChecks,
  Volume2,
  Video,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  parseExerciseDocumentAction,
  createExerciseFromDocumentAction,
} from '@/server/actions/practice';
import type { ParsedExerciseData } from '@/lib/courses/exercise-document-parser';

interface ExerciseDocumentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (exerciseId: string) => void;
  /** Nếu truyền lessonId thì sẽ lưu vào bài học của khóa; nếu không sẽ lưu vào kho Luyện đề mở */
  lessonId?: string;
  isPublicPracticeDefault?: boolean;
  /** Nếu truyền callback này, nút lưu sẽ áp dụng dữ liệu đã phân tích vào form/editor hiện tại */
  onImportIntoCurrent?: (data: ParsedExerciseData) => void;
}

export function ExerciseDocumentImportModal({
  isOpen,
  onClose,
  onSuccess,
  lessonId,
  isPublicPracticeDefault = true,
  onImportIntoCurrent,
}: ExerciseDocumentImportModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  const [isParsing, startParseTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const [parsedData, setParsedData] = useState<ParsedExerciseData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParsedData(null);
      setErrorMessage(null);
    }
  };

  const handleParse = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    if (activeTab === 'upload') {
      if (!selectedFile) {
        setErrorMessage('Vui lòng chọn một file Word (.docx) hoặc Markdown (.md, .mdx).');
        return;
      }
      formData.append('file', selectedFile);
    } else {
      if (!rawText.trim()) {
        setErrorMessage('Vui lòng nhập hoặc dán nội dung đề bài.');
        return;
      }
      formData.append('text', rawText);
    }

    startParseTransition(async () => {
      try {
        const res = await parseExerciseDocumentAction(formData);
        if (res.ok) {
          setParsedData(res.data);
        } else {
          setErrorMessage(res.error);
        }
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Có lỗi xảy ra khi phân tích tài liệu.',
        );
      }
    });
  };

  const handleSave = () => {
    if (!parsedData) return;
    setErrorMessage(null);

    startSaveTransition(async () => {
      try {
        const res = await createExerciseFromDocumentAction(parsedData, {
          lessonId,
          isPublicPractice: isPublicPracticeDefault,
        });

        if (res.ok) {
          setSuccessMessage('Đã tạo đề bài thành công từ tài liệu!');
          router.refresh();
          if (onSuccess) {
            onSuccess(res.data.id);
          }
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setErrorMessage('Không thể tạo đề bài.');
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Lỗi khi lưu đề bài.');
      }
    });
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-200">
      <div className="bg-card border-border/80 text-foreground flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        {/* HEADER */}
        <div className="bg-muted/30 flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary rounded-xl p-2">
              <FileCode className="size-5" />
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold sm:text-lg">
                Tạo đề từ Word (.docx) hoặc MDX
                <span className="bg-primary/10 text-primary border-primary/20 rounded-md border px-2 py-0.5 text-[10px] font-semibold">
                  Tự động phân tích
                </span>
              </h3>
              <p className="text-muted-foreground text-xs">
                Tự động trích xuất tiêu đề, câu hỏi trắc nghiệm, code mẫu, test cases và ngữ liệu đa
                phương tiện.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-lg p-1.5 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* TABS LỰA CHỌN NGUỒN TÀI LIỆU */}
          {!parsedData && (
            <div className="space-y-4">
              <div className="border-border/60 flex border-b">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upload');
                    setErrorMessage(null);
                  }}
                  className={`cursor-pointer border-b-2 px-4 pb-2.5 text-xs font-semibold transition ${
                    activeTab === 'upload'
                      ? 'border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Upload className="size-3.5" /> Tải file Word / MDX
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('paste');
                    setErrorMessage(null);
                  }}
                  className={`cursor-pointer border-b-2 px-4 pb-2.5 text-xs font-semibold transition ${
                    activeTab === 'paste'
                      ? 'border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="size-3.5" /> Dán văn bản trực tiếp
                  </span>
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-border/80 hover:border-primary/50 hover:bg-primary/5 group cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.md,.markdown,.mdx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl transition">
                    <Upload className="text-muted-foreground group-hover:text-primary size-6 transition" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="text-foreground text-sm font-semibold">{selectedFile.name}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {(selectedFile.size / 1024).toFixed(1)} KB — Bấm để chọn file khác
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        Kéo thả hoặc bấm để chọn file Word (.docx) / MDX (.md, .mdx)
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Hỗ trợ tối đa 10 MB. Hệ thống sẽ tự động quét bối cảnh, câu hỏi và đáp án.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-xs font-medium">
                    Dán nội dung Markdown / MDX / Văn bản câu hỏi trắc nghiệm:
                  </label>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={8}
                    placeholder={`# Tiêu đề đề thi\nChủ đề: Lập trình Web\nĐộ khó: DỄ\nAudio: https://example.com/audio.mp3\n\n### Đoạn văn đọc hiểu\nNgữ liệu đề bài ở đây...\n\nCâu 1: Câu hỏi là gì?\nA. Lựa chọn 1\nB. Lựa chọn 2*\nC. Lựa chọn 3\nGiải thích: Lời giải thích...`}
                    className="border-border bg-background focus:ring-primary/20 w-full rounded-xl border p-3 font-mono text-xs focus:ring-2 focus:outline-hidden"
                  />
                </div>
              )}

              {/* GỢI Ý CÚ PHÁP ĐỊNH DẠNG */}
              <div className="border-border/60 bg-muted/30 rounded-xl border p-3">
                <button
                  type="button"
                  onClick={() => setShowCheatsheet(!showCheatsheet)}
                  className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center justify-between text-xs font-semibold"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="text-primary size-3.5" /> Xem quy chuẩn viết file Word / MDX để
                    tự động nhận diện chuẩn xác nhất
                  </span>
                  {showCheatsheet ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>

                {showCheatsheet && (
                  <div className="border-border/40 text-muted-foreground mt-3 space-y-2 border-t pt-3 text-xs">
                    <p>
                      <strong>Đề trắc nghiệm:</strong> Bắt đầu bằng <code>Câu 1: ...</code>, các
                      phương án <code>A. ...</code>, <code>B. ...</code>. Đánh dấu đúng bằng dấu{' '}
                      <code>*</code> (vd: <code>B. Nội dung*</code>), hoặc{' '}
                      <code>[x] B. Nội dung</code>, hoặc viết dòng <code>Đáp án: B</code> ở cuối
                      câu.
                    </p>
                    <p>
                      <strong>Đề lập trình:</strong> Đặt đề bài sau <code>### Đề bài</code>, code
                      khởi tạo trong khối mã <code>```python</code> hoặc <code>```cpp</code>, và các
                      test case sau <code>### Test case 1</code> (có <code>Input: ...</code> và{' '}
                      <code>Output: ...</code>).
                    </p>
                    <p>
                      <strong>Kho học liệu:</strong> Ghi các dòng <code>Audio: URL</code>,{' '}
                      <code>Video: URL</code>, <code>[Đoạn văn đọc hiểu]</code> (hoặc{' '}
                      <code>### Đoạn văn</code>) ở đầu file.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HIỂN THỊ KẾT QUẢ ĐÃ PHÂN TÍCH (PREVIEW & EDIT) */}
          {parsedData && (
            <div className="space-y-4">
              <div className="bg-primary/10 text-primary border-primary/20 flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" /> Đã phân tích thành công cấu trúc đề bài!
                </span>
                <button
                  type="button"
                  onClick={() => setParsedData(null)}
                  className="hover:text-foreground cursor-pointer underline"
                >
                  Chọn file khác
                </button>
              </div>

              {/* THÔNG TIN CHUNG */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-muted-foreground text-xs font-semibold">
                    Tiêu đề đề thi:
                  </label>
                  <Input
                    value={parsedData.title}
                    onChange={(e) => setParsedData({ ...parsedData, title: e.target.value })}
                    className="text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground text-xs font-semibold">
                    Dạng bài tập:
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                        parsedData.type === 'CODE'
                          ? 'bg-info/10 text-info border-info/20 border'
                          : 'bg-primary/10 text-primary border-primary/20 border'
                      }`}
                    >
                      {parsedData.type === 'CODE' ? (
                        <Code2 className="size-3.5" />
                      ) : (
                        <ListChecks className="size-3.5" />
                      )}
                      {parsedData.type === 'CODE'
                        ? 'Lập trình (Code Challenge)'
                        : 'Trắc nghiệm & Ngữ liệu (Quiz)'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground text-xs font-semibold">
                    Chuyên đề / Mức độ:
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={parsedData.category}
                      onChange={(e) => setParsedData({ ...parsedData, category: e.target.value })}
                      placeholder="Chuyên đề"
                      className="h-8 text-xs"
                    />
                    <Select
                      value={parsedData.difficulty}
                      size="sm"
                      onChange={(val) =>
                        setParsedData({
                          ...parsedData,
                          difficulty: val as 'EASY' | 'MEDIUM' | 'HARD',
                        })
                      }
                      options={[
                        { value: 'EASY', label: 'Dễ' },
                        { value: 'MEDIUM', label: 'Trung bình' },
                        { value: 'HARD', label: 'Khó' },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* TÀI NGUYÊN HỌC LIỆU TRÍCH XUẤT ĐƯỢC */}
              {(parsedData.audioUrl || parsedData.videoUrl || parsedData.passage) && (
                <div className="border-primary/20 bg-primary/5 space-y-2 rounded-xl border p-3 text-xs">
                  <p className="text-primary flex items-center gap-1.5 font-semibold">
                    <Sparkles className="size-3.5" /> Kho học liệu đính kèm phát hiện được:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {parsedData.audioUrl && (
                      <span className="bg-info/10 text-info border-info/20 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium">
                        <Volume2 className="size-3" /> Audio: {parsedData.audioUrl}
                      </span>
                    )}
                    {parsedData.videoUrl && (
                      <span className="bg-destructive/10 text-destructive border-destructive/20 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium">
                        <Video className="size-3" /> Video: {parsedData.videoUrl}
                      </span>
                    )}
                    {parsedData.passage && (
                      <span className="bg-warning/10 text-warning border-warning/20 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium">
                        <BookOpen className="size-3" /> Đoạn văn đọc hiểu (
                        {parsedData.passage.length} ký tự)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* CHI TIẾT NỘI DUNG (CÂU HỎI TRẮC NGHIỆM HOẶC TEST CASES) */}
              {parsedData.type === 'QUIZ' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-foreground text-xs font-bold">
                      Danh sách câu hỏi trắc nghiệm ({parsedData.questions.length} câu):
                    </p>
                  </div>
                  <div className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
                    {parsedData.questions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="border-border/70 bg-card space-y-2 rounded-xl border p-3 text-xs"
                      >
                        <p className="text-foreground font-semibold">
                          Câu {idx + 1}: {q.prompt}
                        </p>
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          {q.options?.map((opt) => (
                            <div
                              key={opt.id}
                              className={`flex items-center justify-between rounded-lg border px-2.5 py-1 text-[11px] ${
                                opt.isCorrect
                                  ? 'bg-success/10 border-success/40 text-success font-semibold'
                                  : 'bg-muted/40 border-border/40 text-muted-foreground'
                              }`}
                            >
                              <span>{opt.text}</span>
                              {opt.isCorrect && <CheckCircle2 className="text-success size-3" />}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <p className="text-muted-foreground border-border/40 border-t pt-1.5 text-[11px] italic">
                            💡 Giải thích: {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-foreground text-xs font-bold">
                    Bộ Test cases ({parsedData.testCases.length} bộ test):
                  </p>
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {parsedData.testCases.map((tc, idx) => (
                      <div
                        key={idx}
                        className="border-border/70 bg-card grid grid-cols-2 gap-2 rounded-xl border p-2.5 text-xs"
                      >
                        <div>
                          <span className="text-muted-foreground text-[10px] font-semibold">
                            Input {tc.isSample ? '(Mẫu)' : ''}:
                          </span>
                          <pre className="bg-muted/50 overflow-x-auto rounded-sm p-1.5 font-mono text-[11px]">
                            {tc.input || '(Trống)'}
                          </pre>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] font-semibold">
                            Expected Output:
                          </span>
                          <pre className="bg-muted/50 overflow-x-auto rounded-sm p-1.5 font-mono text-[11px]">
                            {tc.expectedOutput || '(Trống)'}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* THÔNG BÁO LỖI HOẶC THÀNH CÔNG */}
          {errorMessage && (
            <div className="bg-destructive/10 text-destructive border-destructive/20 flex items-center gap-2 rounded-xl border p-3 text-xs font-medium">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-success/10 text-success border-success/20 flex items-center gap-2 rounded-xl border p-3 text-xs font-medium">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-muted/20 flex items-center justify-end gap-2.5 border-t px-5 py-3.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isParsing || isSaving}
          >
            Hủy bỏ
          </Button>

          {!parsedData ? (
            <Button
              type="button"
              size="sm"
              onClick={handleParse}
              disabled={
                isParsing ||
                (activeTab === 'upload' && !selectedFile) ||
                (activeTab === 'paste' && !rawText.trim())
              }
              className="bg-primary text-primary-foreground gap-1.5 font-semibold"
            >
              {isParsing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {isParsing ? 'Đang phân tích...' : 'Phân tích tài liệu'}
            </Button>
          ) : onImportIntoCurrent ? (
            <Button
              type="button"
              size="sm"
              onClick={() => onImportIntoCurrent(parsedData)}
              className="cursor-pointer gap-1.5 font-semibold"
            >
              <CheckCircle2 className="size-3.5" />
              Áp dụng vào đề đang soạn
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="success"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5 font-semibold"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {isSaving ? 'Đang tạo bài tập...' : 'Tạo đề vào hệ thống'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
