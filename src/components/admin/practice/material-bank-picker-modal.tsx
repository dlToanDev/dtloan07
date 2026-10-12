'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Volume2,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  X,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { BankMaterialItem } from '@/server/actions/practice';

interface MaterialBankPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: BankMaterialItem[];
  onSelectMaterial: (material: BankMaterialItem) => void;
}

export function MaterialBankPickerModal({
  isOpen,
  onClose,
  materials,
  onSelectMaterial,
}: MaterialBankPickerModalProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const categories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => {
      if (m.category?.trim()) set.add(m.category.trim());
    });
    return Array.from(set);
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchCat = categoryFilter === 'ALL' || m.category?.trim() === categoryFilter;
      if (!matchCat) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        m.title.toLowerCase().includes(q) ||
        (m.passage && m.passage.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
      );
    });
  }, [materials, search, categoryFilter]);

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm duration-200 sm:p-5">
      <div className="border-border bg-card flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        {/* HEADER */}
        <div className="border-border flex items-center justify-between border-b p-4 sm:px-6">
          <div>
            <h2 className="text-foreground flex items-center gap-2 text-base font-bold sm:text-lg">
              Kho Học Liệu & Ngữ Liệu Đa Phương Tiện
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
                {materials.length} mục có sẵn
              </span>
            </h2>
            <p className="text-muted-foreground text-xs">
              Chọn bài đọc (passage), file âm thanh nghe, hoặc video có sẵn để đưa vào đề thi.
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

        {/* SEARCH BAR */}
        <div className="border-border/80 bg-muted/20 border-b p-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên ngữ liệu, nội dung bài đọc hiểu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border bg-background focus:ring-primary/20 w-full rounded-xl border py-2 pr-3 pl-9 text-xs focus:ring-2 focus:outline-none sm:text-sm"
              />
            </div>

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
          </div>
        </div>

        {/* MATERIALS LIST */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {filteredMaterials.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center space-y-2 py-12 text-center">
              <p className="text-sm font-semibold">Chưa có ngữ liệu nào phù hợp</p>
              <p className="max-w-sm text-xs">
                Không tìm thấy ngữ liệu nào khớp với tìm kiếm. Bạn có thể tự nhập ngữ liệu mới trong
                form.
              </p>
            </div>
          ) : (
            filteredMaterials.map((mat) => (
              <div
                key={mat.id}
                className="border-border/80 bg-muted/10 hover:border-primary/40 space-y-3 rounded-2xl border p-4 transition-all"
              >
                <div className="border-border/60 flex flex-wrap items-start justify-between gap-2 border-b pb-2.5">
                  <div>
                    <h3 className="text-foreground text-sm font-bold">{mat.title}</h3>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      {mat.category && (
                        <span className="bg-primary/10 text-primary rounded px-2 py-0.5 font-semibold">
                          {mat.category}
                        </span>
                      )}
                      <span>• Nguồn: {mat.sourceExerciseTitle}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onSelectMaterial(mat);
                      onClose();
                    }}
                    className="cursor-pointer text-xs font-bold"
                  >
                    Áp dụng ngữ liệu này
                  </Button>
                </div>

                {/* Đoạn văn */}
                {mat.passage && (
                  <div className="border-border/60 bg-background/80 space-y-1 rounded-xl border p-3">
                    <span className="text-primary text-[11px] font-bold">
                      Bài đọc hiểu (Passage trích đoạn):
                    </span>
                    <p className="text-foreground/80 line-clamp-4 text-xs leading-relaxed whitespace-pre-wrap">
                      {mat.passage}
                    </p>
                  </div>
                )}

                {/* Audio */}
                {mat.audioUrl && (
                  <div className="border-info/30 bg-info/5 flex items-center gap-3 rounded-xl border p-2.5">
                    <span className="text-info shrink-0 text-xs font-bold">Âm thanh nghe:</span>
                    <audio controls src={mat.audioUrl} className="h-8 flex-1" />
                  </div>
                )}

                {/* Video & Image */}
                <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                  {mat.videoUrl && (
                    <span className="text-destructive font-medium">Có video bài giảng</span>
                  )}
                  {mat.imageUrl && (
                    <span className="text-success font-medium">Có ảnh sơ đồ minh họa</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="border-border bg-card flex items-center justify-end border-t p-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="cursor-pointer text-xs"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
