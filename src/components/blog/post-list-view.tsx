'use client';

import { PostCard } from '@/components/blog/post-card';
import { CATEGORY_LABELS, getCategoryLabel } from '@/config/blog';
import { cn } from '@/lib/utils';
import { calculateFeaturedScore, type PostMeta } from '@/types/post';
import {
  Clock,
  Flame,
  LayoutGrid,
  List,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState, useSyncExternalStore } from 'react';

type PostView = 'list' | 'grid';
type FilterTab = 'all' | 'latest' | 'featured' | 'popular';
type SortOption = 'newest' | 'interactions' | 'views' | 'likes' | 'comments';

const STORAGE_KEY = 'blog-post-view';
const VIEW_CHANGE_EVENT = 'blog-post-view-change';

function subscribeToView(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(VIEW_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(VIEW_CHANGE_EVENT, callback);
  };
}

function getSavedView(): PostView {
  return window.localStorage.getItem(STORAGE_KEY) === 'grid' ? 'grid' : 'list';
}

function getServerView(): PostView {
  return 'list';
}

function saveView(view: PostView) {
  window.localStorage.setItem(STORAGE_KEY, view);
  window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
}

function getInteractions(post: PostMeta): number {
  return post.featuredScore ?? calculateFeaturedScore(post);
}

export function PostListView({ posts }: { posts: PostMeta[] }) {
  const view = useSyncExternalStore(subscribeToView, getSavedView, getServerView);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Đếm số lượng bài viết nổi bật: bài có gắn cờ featured hoặc điểm tương tác cao (>= 1500)
  const featuredCount = useMemo(
    () => posts.filter((p) => p.featured || getInteractions(p) >= 1500).length,
    [posts],
  );

  // Tổng hợp chuyên mục cấu hình + chuyên mục từ các bài viết
  const allCategories = useMemo(() => {
    const map = new Map<string, string>(Object.entries(CATEGORY_LABELS));
    for (const post of posts) {
      if (!map.has(post.category)) {
        map.set(post.category, getCategoryLabel(post.category));
      }
    }
    return Array.from(map.entries());
  }, [posts]);

  // Lọc và sắp xếp bài viết
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Lọc theo Category nếu có
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Lọc theo Tab bộ lọc
    if (activeTab === 'featured') {
      result = result.filter((p) => p.featured || getInteractions(p) >= 1500);
    }

    // Sắp xếp
    result.sort((a, b) => {
      // Ưu tiên tab Nổi bật hoặc tab Nhiều tương tác: xếp theo Điểm nổi bật
      // Điểm = (lượt xem × 1) + (like × 2) + (comment × 3) + (share × 2)
      if (activeTab === 'featured' || activeTab === 'popular' || sortBy === 'interactions') {
        const diff = getInteractions(b) - getInteractions(a);
        if (diff !== 0) return diff;
      }

      if (sortBy === 'views') {
        const diff = (b.views ?? 0) - (a.views ?? 0);
        if (diff !== 0) return diff;
      }

      if (sortBy === 'likes') {
        const diff = (b.likes ?? 0) - (a.likes ?? 0);
        if (diff !== 0) return diff;
      }

      if (sortBy === 'comments') {
        const diff = (b.comments ?? 0) - (a.comments ?? 0);
        if (diff !== 0) return diff;
      }

      // Mặc định hoặc tab Mới nhất: theo ngày đăng
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return result;
  }, [posts, activeTab, selectedCategory, sortBy]);

  const resetFilters = () => {
    setActiveTab('all');
    setSelectedCategory('all');
    setSortBy('newest');
  };

  const isFiltered = activeTab !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest';

  return (
    <>
      {/* THANH BỘ LỌC VÀ ĐIỀU KHIỂN HIỂN THỊ */}
      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Nhóm các Tab lọc chính: Tất cả, Mới nhất, Nổi bật, Nhiều tương tác */}
          <div
            className="border-border bg-muted/60 inline-flex flex-wrap items-center gap-1 rounded-xl border p-1"
            role="tablist"
            aria-label="Bộ lọc bài viết"
          >
            <FilterTabButton
              active={activeTab === 'all'}
              label="Tất cả"
              count={posts.length}
              onClick={() => {
                setActiveTab('all');
                setSortBy('newest');
              }}
            />
            <FilterTabButton
              active={activeTab === 'latest'}
              icon={<Clock className="size-3.5 text-blue-500" />}
              label="Mới nhất"
              onClick={() => {
                setActiveTab('latest');
                setSortBy('newest');
              }}
            />
            <FilterTabButton
              active={activeTab === 'featured'}
              icon={<Sparkles className="size-3.5 text-amber-500" />}
              label="Nổi bật"
              count={featuredCount}
              onClick={() => {
                setActiveTab('featured');
              }}
            />
            <FilterTabButton
              active={activeTab === 'popular'}
              icon={<Flame className="size-3.5 text-rose-500" />}
              label="Nhiều tương tác"
              onClick={() => {
                setActiveTab('popular');
                setSortBy('interactions');
              }}
            />
          </div>

          {/* Nhóm phụ: Lọc chuyên mục + Sắp xếp + Chuyển đổi Danh sách/Lưới */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:justify-end">
            {/* Lọc chuyên mục */}
            <div className="flex items-center gap-1.5 text-xs">
              <SlidersHorizontal className="text-muted-foreground size-3.5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Lọc theo chuyên mục"
                className="border-border bg-background text-foreground focus:ring-primary/40 h-8 rounded-lg border px-2.5 text-xs font-medium focus:ring-2 focus:outline-none"
              >
                <option value="all">Tất cả chuyên mục</option>
                {allCategories.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sắp xếp chi tiết */}
            <select
              value={sortBy}
              onChange={(e) => {
                const val = e.target.value as SortOption;
                setSortBy(val);
              }}
              aria-label="Sắp xếp danh sách bài viết"
              className="border-border bg-background text-foreground focus:ring-primary/40 h-8 rounded-lg border px-2.5 text-xs font-medium focus:ring-2 focus:outline-none"
            >
              <option value="newest">Ngày đăng: Mới nhất</option>
              <option value="interactions">
                Điểm nổi bật: Cao nhất (Xem×1, Like×2, CMT×3, Share×2)
              </option>
              <option value="views">Lượt xem: Nhiều nhất</option>
              <option value="likes">Lượt thích: Nhiều nhất</option>
              <option value="comments">Bình luận: Nhiều nhất</option>
            </select>

            {/* Switcher Danh sách / Lưới */}
            <div
              className="border-border bg-muted/60 inline-flex rounded-lg border p-1"
              role="group"
              aria-label="Kiểu hiển thị bài viết"
            >
              <ViewButton
                active={view === 'list'}
                label="Danh sách"
                icon={<List aria-hidden="true" className="size-4" />}
                onClick={() => saveView('list')}
              />
              <ViewButton
                active={view === 'grid'}
                label="Lưới"
                icon={<LayoutGrid aria-hidden="true" className="size-4" />}
                onClick={() => saveView('grid')}
              />
            </div>
          </div>
        </div>

        {/* Thanh trạng thái bộ lọc đang hoạt động */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-muted-foreground flex items-center gap-2">
            <span>
              Hiển thị <strong>{filteredPosts.length}</strong> / {posts.length} bài viết
            </span>
            {activeTab === 'featured' && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                ★ Bài viết nổi bật: Điểm = Lượt xem (×1) + Like (×2) + Bình luận (×3) + Chia sẻ (×2)
              </span>
            )}
            {activeTab === 'popular' && (
              <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 font-medium text-rose-600 dark:text-rose-400">
                🔥 Xếp theo điểm tương tác cao nhất
              </span>
            )}
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="hover:text-foreground text-muted-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline"
            >
              <RotateCcw className="size-3" /> Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* DANH SÁCH BÀI VIẾT HOẶC TRẠNG THÁI TRỐNG */}
      {filteredPosts.length === 0 ? (
        <div className="border-border bg-card/50 mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
          <SlidersHorizontal className="text-muted-foreground/50 mb-3 size-10" />
          <h3 className="text-foreground text-base font-semibold">
            Không tìm thấy bài viết phù hợp
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Hiện không có bài viết nào thỏa mãn các điều kiện lọc đã chọn. Vui lòng thử đổi điều
            kiện hoặc đặt lại bộ lọc.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium shadow-xs transition-colors"
          >
            <RotateCcw className="size-3.5" /> Xem tất cả bài viết
          </button>
        </div>
      ) : (
        <div
          className={cn(
            'mt-6',
            view === 'grid' ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-8',
          )}
        >
          {filteredPosts.map((post) => (
            <PostCard key={post.slug} post={post} variant={view} />
          ))}
        </div>
      )}
    </>
  );
}

function FilterTabButton({
  active,
  label,
  icon,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all',
        active
          ? 'bg-background text-foreground font-semibold shadow-xs'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'py-0.2 ml-0.5 rounded-full px-1.5 text-[10px] font-semibold',
            active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ViewButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`Hiển thị dạng ${label.toLocaleLowerCase('vi-VN')}`}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all',
        active
          ? 'bg-background text-foreground shadow-xs'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
