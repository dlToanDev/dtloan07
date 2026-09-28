'use client';

import { useState, useMemo, useSyncExternalStore, useEffect } from 'react';
import { CourseCard } from '@/components/courses/course-card';
import { ViewSwitcher, type ViewMode } from '@/components/ui/view-switcher';
import { PaginationControl } from '@/components/ui/pagination-control';
import { Input } from '@/components/ui/input';
import type { Course } from '@prisma/client';
import { GraduationCap, RotateCcw, Search, SlidersHorizontal, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'courses-view-mode';
const VIEW_CHANGE_EVENT = 'courses-view-mode-change';
const PAGE_SIZE = 10;

function subscribeToView(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(VIEW_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(VIEW_CHANGE_EVENT, callback);
  };
}

function getSavedView(): ViewMode {
  return window.localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'grid';
}

function getServerView(): ViewMode {
  return 'grid';
}

function saveView(newView: ViewMode) {
  window.localStorage.setItem(STORAGE_KEY, newView);
  window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
}

export interface CourseSubtopic {
  id: string;
  name: string;
  match: (course: Course) => boolean;
}

export interface CourseTrackGroup {
  id: string;
  name: string;
  match: (course: Course) => boolean;
  subtopics: CourseSubtopic[];
}

// CẤU TRÚC 2 TẦNG BẬC CHO KHÓA HỌC: TẦNG 1 (LỘ TRÌNH ĐÀO TẠO) -> TẦNG 2 (CHUYÊN ĐỀ CON)
export const COURSE_TRACKS: CourseTrackGroup[] = [
  {
    id: 'FULLSTACK',
    name: '🌐 Lập trình Web Fullstack',
    match: (c) => {
      const s = (c.slug || '').toLowerCase();
      const t = (c.title || '').toLowerCase();
      return (
        s.includes('nextjs') ||
        s.includes('fullstack') ||
        t.includes('next.js') ||
        t.includes('web')
      );
    },
    subtopics: [
      {
        id: 'NEXTJS_CORE',
        name: '⚛️ Next.js 15 & Server Actions',
        match: (c) => {
          const s = (c.slug || '').toLowerCase();
          const t = (c.title || '').toLowerCase();
          return s.includes('nextjs') || t.includes('next.js');
        },
      },
      {
        id: 'PAYMENT_AUTH',
        name: '💳 Thanh toán VietQR & Auth.js',
        match: (c) => {
          const d = (c.description || '').toLowerCase();
          return d.includes('thanh toán') || d.includes('auth');
        },
      },
    ],
  },
  {
    id: 'DEVOPS',
    name: '🐧 Quản trị Hệ thống, VPS & Docker',
    match: (c) => {
      const s = (c.slug || '').toLowerCase();
      const t = (c.title || '').toLowerCase();
      return (
        s.includes('devops') ||
        s.includes('vps') ||
        t.includes('vps') ||
        t.includes('docker') ||
        t.includes('linux')
      );
    },
    subtopics: [
      {
        id: 'VPS_LINUX',
        name: '🖥️ Quản trị VPS Linux & SSH',
        match: (c) => {
          const s = (c.slug || '').toLowerCase();
          const t = (c.title || '').toLowerCase();
          return s.includes('vps') || t.includes('linux');
        },
      },
      {
        id: 'DOCKER_NGINX',
        name: '🐳 Docker Compose & Nginx Reverse Proxy',
        match: (c) => {
          const d = (c.description || '').toLowerCase();
          return d.includes('docker') || d.includes('nginx');
        },
      },
    ],
  },
];

export type CoursePriceFilter = 'ALL' | 'FREE' | 'PAID';
export type CourseSort = 'newest' | 'price_asc' | 'price_desc';

export function CourseList({ courses }: { courses: Course[] }) {
  const view = useSyncExternalStore(subscribeToView, getSavedView, getServerView);

  // States lọc 2 tầng
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<string>('ALL');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPrice, setSelectedPrice] = useState<CoursePriceFilter>('ALL');
  const [sortBy, setSortBy] = useState<CourseSort>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const activeTrackGroup = useMemo(() => {
    return COURSE_TRACKS.find((t) => t.id === selectedTrack);
  }, [selectedTrack]);

  const availableSubtopics = useMemo(() => {
    return activeTrackGroup ? activeTrackGroup.subtopics : [];
  }, [activeTrackGroup]);

  // Lọc và sắp xếp khóa học
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // 1. Tìm kiếm từ khóa
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((c) => {
        const titleMatch = (c.title || '').toLowerCase().includes(q);
        const descMatch = (c.description || '').toLowerCase().includes(q);
        const levelMatch = (c.level || '').toLowerCase().includes(q);
        return titleMatch || descMatch || levelMatch;
      });
    }

    // 2. Lọc theo Tầng 1: Lộ trình đào tạo
    if (selectedTrack !== 'ALL' && activeTrackGroup) {
      result = result.filter((c) => activeTrackGroup.match(c));

      // 3. Lọc theo Tầng 2: Chuyên đề con
      if (selectedSubtopic !== 'ALL') {
        const sub = activeTrackGroup.subtopics.find((s) => s.id === selectedSubtopic);
        if (sub) {
          result = result.filter((c) => sub.match(c));
        }
      }
    }

    // 4. Lọc theo trạng thái
    if (selectedStatus !== 'ALL') {
      result = result.filter((c) => c.status === selectedStatus);
    }

    // 5. Lọc theo học phí
    if (selectedPrice !== 'ALL') {
      if (selectedPrice === 'FREE') result = result.filter((c) => c.priceVnd === 0);
      else if (selectedPrice === 'PAID') result = result.filter((c) => c.priceVnd > 0);
    }

    // 6. Sắp xếp
    result.sort((a, b) => {
      if (sortBy === 'price_asc') return a.priceVnd - b.priceVnd;
      if (sortBy === 'price_desc') return b.priceVnd - a.priceVnd;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [
    courses,
    searchQuery,
    selectedTrack,
    activeTrackGroup,
    selectedSubtopic,
    selectedStatus,
    selectedPrice,
    sortBy,
  ]);

  // Reset trang về 1 khi bất kỳ điều kiện lọc nào thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTrack, selectedSubtopic, selectedStatus, selectedPrice, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedTrack !== 'ALL' ||
    selectedSubtopic !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedPrice !== 'ALL' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedTrack('ALL');
    setSelectedSubtopic('ALL');
    setSelectedStatus('ALL');
    setSelectedPrice('ALL');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCourses = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredCourses.slice(start, start + PAGE_SIZE);
  }, [filteredCourses, safeCurrentPage]);

  return (
    <div className="space-y-6">
      {/* KHUNG BỘ LỌC 2 TẦNG BẬC CHO KHÓA HỌC */}
      <section
        aria-label="Tìm kiếm và bộ lọc khóa học"
        className="border-border bg-card/70 space-y-4 rounded-2xl border p-4 shadow-xs sm:p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-primary size-4" />
            <h2 className="text-sm font-bold">Tìm kiếm & Bộ lọc khóa học 2 tầng bậc</h2>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold transition"
            >
              <RotateCcw className="size-3.5" /> Đặt lại bộ lọc
            </button>
          )}
        </div>

        {/* Lưới Listbox 2 Tầng: Tầng 1 (Lộ trình) -> Tầng 2 (Chuyên đề) */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Ô tìm kiếm từ khóa */}
          <div className="relative">
            <span className="sr-only">Tìm kiếm khóa học</span>
            <Search className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên khóa học..."
              className="h-10 pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* TẦNG 1: LỘ TRÌNH ĐÀO TẠO (Listbox) */}
          <div>
            <label className="sr-only">Tầng 1: Chọn lộ trình chính</label>
            <select
              value={selectedTrack}
              onChange={(e) => {
                setSelectedTrack(e.target.value);
                setSelectedSubtopic('ALL'); // Reset chuyên đề con
              }}
              aria-label="Tầng 1: Chọn lộ trình chính"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="ALL">🎓 Tất cả lộ trình đào tạo</option>
              {COURSE_TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* TẦNG 2: CHUYÊN ĐỀ CON (Tự động đổi theo Tầng 1) */}
          <div>
            <label className="sr-only">Tầng 2: Chọn chuyên đề</label>
            <select
              value={selectedSubtopic}
              onChange={(e) => setSelectedSubtopic(e.target.value)}
              disabled={selectedTrack === 'ALL'}
              aria-label="Tầng 2: Chọn chuyên đề con"
              className={`h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-semibold transition outline-none ${
                selectedTrack === 'ALL'
                  ? 'border-input/50 bg-muted/30 text-muted-foreground cursor-not-allowed'
                  : 'border-primary/50 bg-primary/5 text-primary focus:ring-primary/40 focus:ring-2'
              }`}
            >
              <option value="ALL">
                {selectedTrack === 'ALL' ? '📁 Chọn lộ trình trước' : '📂 Tất cả chuyên đề'}
              </option>
              {availableSubtopics.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Học phí */}
          <div>
            <label className="sr-only">Học phí</label>
            <select
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value as CoursePriceFilter)}
              aria-label="Lọc theo học phí"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="ALL">💰 Mọi mức học phí</option>
              <option value="FREE">🎉 Miễn phí</option>
              <option value="PAID">⭐ Chuyên sâu có phí</option>
            </select>
          </div>

          {/* Sắp xếp */}
          <div>
            <label className="sr-only">Sắp xếp</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CourseSort)}
              aria-label="Sắp xếp khóa học"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="newest">🕒 Mới nhất</option>
              <option value="price_asc">⬆️ Học phí: Thấp đến cao</option>
              <option value="price_desc">⬇️ Học phí: Cao đến thấp</option>
            </select>
          </div>
        </div>

        {/* Thanh trạng thái: Số lượng + View Switcher */}
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="text-muted-foreground">
              Hiển thị <strong>{paginatedCourses.length}</strong> /{' '}
              <strong>{filteredCourses.length}</strong> khóa học
            </span>
            {selectedTrack !== 'ALL' && (
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold">
                {activeTrackGroup?.name}
                {selectedSubtopic !== 'ALL' && (
                  <>
                    <ChevronRight className="size-3" />
                    {availableSubtopics.find((s) => s.id === selectedSubtopic)?.name}
                  </>
                )}
              </span>
            )}
          </div>

          <ViewSwitcher view={view} onChange={saveView} size="sm" />
        </div>
      </section>

      {/* DANH SÁCH KHÓA HỌC HOẶC TRẠNG THÁI TRỐNG */}
      {filteredCourses.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-12 text-center">
          <GraduationCap className="mx-auto mb-3 size-10 opacity-50" />
          <h3 className="text-foreground text-sm font-semibold">Không tìm thấy khóa học phù hợp</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Vui lòng thử tìm với từ khóa khác hoặc đặt lại bộ lọc.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="text-primary mt-4 cursor-pointer text-xs font-semibold hover:underline"
          >
            Xem tất cả khóa học
          </button>
        </div>
      ) : (
        <div className={view === 'grid' ? 'grid gap-6 md:grid-cols-2' : 'flex flex-col gap-4'}>
          {paginatedCourses.map((course) => (
            <CourseCard key={course.id} course={course} variant={view} />
          ))}
        </div>
      )}

      {/* Phân trang: 10 khóa học / trang */}
      <PaginationControl
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        totalItems={filteredCourses.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
