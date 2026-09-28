'use client';

import { PostCard } from '@/components/blog/post-card';
import { cn } from '@/lib/utils';
import { calculateFeaturedScore, type PostMeta } from '@/types/post';
import { PaginationControl } from '@/components/ui/pagination-control';
import { ViewSwitcher, type ViewMode } from '@/components/ui/view-switcher';
import { Input } from '@/components/ui/input';
import {
  Clock,
  Flame,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

type FilterTab = 'all' | 'latest' | 'featured' | 'popular';
type SortOption = 'newest' | 'interactions' | 'views' | 'likes' | 'comments';

const STORAGE_KEY = 'blog-post-view';
const VIEW_CHANGE_EVENT = 'blog-post-view-change';
const POSTS_PER_PAGE = 10;

function subscribeToView(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(VIEW_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(VIEW_CHANGE_EVENT, callback);
  };
}

function getSavedView(): ViewMode {
  return window.localStorage.getItem(STORAGE_KEY) === 'grid' ? 'grid' : 'list';
}

function getServerView(): ViewMode {
  return 'list';
}

function saveView(view: ViewMode) {
  window.localStorage.setItem(STORAGE_KEY, view);
  window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
}

function getInteractions(post: PostMeta): number {
  return post.featuredScore ?? calculateFeaturedScore(post);
}

// CẤU TRÚC 2 TẦNG CHO BLOG: TẦNG 1 (CHỦ ĐỀ LỚN) -> TẦNG 2 (CHUYÊN ĐỀ CON)
export interface BlogSubtopic {
  id: string;
  name: string;
  match: (post: PostMeta) => boolean;
}

export interface BlogTopicGroup {
  id: string;
  name: string;
  match: (post: PostMeta) => boolean;
  subtopics: BlogSubtopic[];
}

export const BLOG_TOPICS: BlogTopicGroup[] = [
  {
    id: 'WEB_DEV',
    name: '💻 Lập trình Web & Fullstack',
    match: (p) => {
      const cat = p.category || '';
      const s = p.slug.toLowerCase();
      const tags = (p.tags || []).map((t) => t.toLowerCase());
      return (
        cat === 'lap-trinh' ||
        tags.includes('nextjs') ||
        tags.includes('react') ||
        tags.includes('typescript') ||
        tags.includes('zod') ||
        s.includes('nextjs') ||
        s.includes('react') ||
        s.includes('zod')
      );
    },
    subtopics: [
      {
        id: 'NEXTJS',
        name: '⚛️ Next.js & Server Actions',
        match: (p) => {
          const s = p.slug.toLowerCase();
          const tags = (p.tags || []).map((t) => t.toLowerCase());
          return s.includes('nextjs') || tags.includes('nextjs') || tags.includes('server-actions');
        },
      },
      {
        id: 'TYPESCRIPT',
        name: '📘 TypeScript & Zod Validation',
        match: (p) => {
          const s = p.slug.toLowerCase();
          const tags = (p.tags || []).map((t) => t.toLowerCase());
          return s.includes('zod') || tags.includes('zod') || tags.includes('typescript');
        },
      },
      {
        id: 'POSTGRES',
        name: '🐘 PostgreSQL & Prisma ORM',
        match: (p) => {
          const s = p.slug.toLowerCase();
          const tags = (p.tags || []).map((t) => t.toLowerCase());
          return s.includes('postgres') || tags.includes('postgresql') || tags.includes('prisma');
        },
      },
    ],
  },
  {
    id: 'DEVOPS',
    name: '☁️ DevOps, VPS & Cloud',
    match: (p) => {
      const cat = p.category || '';
      const s = p.slug.toLowerCase();
      const tags = (p.tags || []).map((t) => t.toLowerCase());
      return (
        cat === 'devops' ||
        tags.includes('docker') ||
        tags.includes('linux') ||
        tags.includes('vps') ||
        tags.includes('nginx') ||
        tags.includes('cicd') ||
        s.includes('docker') ||
        s.includes('nginx') ||
        s.includes('vps') ||
        s.includes('cicd') ||
        s.includes('prometheus')
      );
    },
    subtopics: [
      {
        id: 'DOCKER',
        name: '🐳 Docker & Docker Compose',
        match: (p) => {
          const s = p.slug.toLowerCase();
          const tags = (p.tags || []).map((t) => t.toLowerCase());
          return s.includes('docker') || tags.includes('docker');
        },
      },
      {
        id: 'LINUX_SECURITY',
        name: '🐧 Linux, UFW & Fail2ban',
        match: (p) => {
          const s = p.slug.toLowerCase();
          const tags = (p.tags || []).map((t) => t.toLowerCase());
          return (
            s.includes('bao-mat') ||
            s.includes('ufw') ||
            tags.includes('linux') ||
            tags.includes('security')
          );
        },
      },
      {
        id: 'NGINX',
        name: '🌐 Nginx & Reverse Proxy',
        match: (p) => {
          const s = p.slug.toLowerCase();
          const tags = (p.tags || []).map((t) => t.toLowerCase());
          return s.includes('nginx') || tags.includes('nginx');
        },
      },
      {
        id: 'MONITORING_CICD',
        name: '📈 Giám sát & GitHub Actions CI/CD',
        match: (p) => {
          const s = p.slug.toLowerCase();
          const tags = (p.tags || []).map((t) => t.toLowerCase());
          return s.includes('cicd') || s.includes('prometheus') || tags.includes('cicd');
        },
      },
    ],
  },
  {
    id: 'SYSTEM_AI',
    name: '🏗️ Kiến trúc hệ thống & AI',
    match: (p) => {
      const cat = p.category || '';
      const s = p.slug.toLowerCase();
      const tags = (p.tags || []).map((t) => t.toLowerCase());
      return (
        cat === 'kien-truc-he-thong' ||
        tags.includes('ai') ||
        tags.includes('rabbitmq') ||
        tags.includes('redis') ||
        s.includes('ai-') ||
        s.includes('rabbitmq') ||
        s.includes('redis') ||
        s.includes('openai')
      );
    },
    subtopics: [
      {
        id: 'AI_MODELS',
        name: '🤖 AI Agents, GPT & Claude',
        match: (p) => {
          const s = p.slug.toLowerCase();
          const tags = (p.tags || []).map((t) => t.toLowerCase());
          return (
            s.includes('ai') || s.includes('gpt') || s.includes('openai') || tags.includes('ai')
          );
        },
      },
      {
        id: 'MESSAGE_QUEUE',
        name: '🐇 RabbitMQ & Event-Driven',
        match: (p) => {
          const s = p.slug.toLowerCase();
          const tags = (p.tags || []).map((t) => t.toLowerCase());
          return s.includes('rabbitmq') || tags.includes('rabbitmq');
        },
      },
      {
        id: 'CACHE_LAYER',
        name: '⚡ Redis Cache Layer',
        match: (p) => {
          const s = p.slug.toLowerCase();
          const tags = (p.tags || []).map((t) => t.toLowerCase());
          return s.includes('redis') || tags.includes('redis');
        },
      },
    ],
  },
  {
    id: 'COMMUNITY',
    name: '👥 Bài viết cộng đồng',
    match: (p) => p.category === 'cong-dong',
    subtopics: [
      {
        id: 'PERFORMANCE',
        name: '🚀 Tối ưu hiệu năng & Lighthouse',
        match: (p) => {
          const s = p.slug.toLowerCase();
          return s.includes('lighthouse') || s.includes('toi-uu');
        },
      },
    ],
  },
];

export function PostListView({ posts }: { posts: PostMeta[] }) {
  const view = useSyncExternalStore(subscribeToView, getSavedView, getServerView);

  // States lọc 2 tầng
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Đếm số bài viết nổi bật
  const featuredCount = useMemo(
    () => posts.filter((p) => p.featured || getInteractions(p) >= 1500).length,
    [posts],
  );

  // Chủ đề đang chọn ở Tầng 1
  const activeTopicGroup = useMemo(() => {
    return BLOG_TOPICS.find((t) => t.id === selectedTopic);
  }, [selectedTopic]);

  // Các chuyên đề con theo Tầng 1
  const availableSubtopics = useMemo(() => {
    return activeTopicGroup ? activeTopicGroup.subtopics : [];
  }, [activeTopicGroup]);

  // Lọc và sắp xếp bài viết
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // 1. Tìm kiếm từ khóa
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((p) => {
        const titleMatch = (p.title || '').toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(q));
        const catMatch = (p.category || '').toLowerCase().includes(q);
        return titleMatch || descMatch || tagMatch || catMatch;
      });
    }

    // 2. Lọc theo Tầng 1: Chủ đề chính
    if (selectedTopic !== 'ALL' && activeTopicGroup) {
      result = result.filter((p) => activeTopicGroup.match(p));

      // 3. Lọc theo Tầng 2: Chuyên đề con
      if (selectedSubtopic !== 'ALL') {
        const subConfig = activeTopicGroup.subtopics.find((s) => s.id === selectedSubtopic);
        if (subConfig) {
          result = result.filter((p) => subConfig.match(p));
        }
      }
    }

    // 4. Lọc theo Tab nhanh
    if (activeTab === 'featured') {
      result = result.filter((p) => p.featured || getInteractions(p) >= 1500);
    }

    // 5. Sắp xếp
    result.sort((a, b) => {
      if (activeTab === 'featured' || activeTab === 'popular' || sortBy === 'interactions') {
        const diff = getInteractions(b) - getInteractions(a);
        if (diff !== 0) return diff;
      }
      if (sortBy === 'views') return (b.views ?? 0) - (a.views ?? 0);
      if (sortBy === 'likes') return (b.likes ?? 0) - (a.likes ?? 0);
      if (sortBy === 'comments') return (b.comments ?? 0) - (a.comments ?? 0);
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return result;
  }, [posts, searchQuery, selectedTopic, activeTopicGroup, selectedSubtopic, activeTab, sortBy]);

  // Reset trang về 1 khi bất kỳ điều kiện lọc nào thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTopic, selectedSubtopic, activeTab, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedTopic('ALL');
    setSelectedSubtopic('ALL');
    setActiveTab('all');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedTopic !== 'ALL' ||
    selectedSubtopic !== 'ALL' ||
    activeTab !== 'all' ||
    sortBy !== 'newest';

  // Tính toán phân trang
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPosts = useMemo(() => {
    const start = (safeCurrentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(start, start + POSTS_PER_PAGE);
  }, [filteredPosts, safeCurrentPage]);

  return (
    <>
      {/* KHUNG BỘ LỌC 2 TẦNG BẬC CHUẨN CHO BLOG */}
      <section
        aria-label="Tìm kiếm và bộ lọc bài viết"
        className="border-border bg-card/70 mt-8 space-y-4 rounded-2xl border p-4 shadow-xs sm:p-5"
      >
        {/* Header Bộ lọc & Nút đặt lại */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-primary size-4" />
            <h2 className="text-sm font-bold">Tìm kiếm & Bộ lọc bài viết 2 tầng bậc</h2>
          </div>
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold transition"
            >
              <RotateCcw className="size-3.5" /> Đặt lại bộ lọc
            </button>
          )}
        </div>

        {/* Lưới Listbox 2 Tầng: Tầng 1 (Chủ đề lớn) -> Tầng 2 (Chuyên đề con) */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Ô tìm kiếm từ khóa */}
          <div className="relative">
            <span className="sr-only">Tìm kiếm bài viết</span>
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tiêu đề, tag..."
              className="bg-background h-10 pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* TẦNG 1: CHỦ ĐỀ CHÍNH (Listbox) */}
          <div>
            <label className="sr-only">Tầng 1: Chọn chủ đề chính</label>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setSelectedSubtopic('ALL'); // Reset tầng 2 khi đổi tầng 1
              }}
              aria-label="Tầng 1: Chọn chủ đề chính"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="ALL">📚 Tất cả lĩnh vực / chủ đề</option>
              {BLOG_TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* TẦNG 2: CHUYÊN ĐỀ CON (Tự động đổi theo Tầng 1) */}
          <div>
            <label className="sr-only">Tầng 2: Chọn chuyên sâu</label>
            <select
              value={selectedSubtopic}
              onChange={(e) => setSelectedSubtopic(e.target.value)}
              disabled={selectedTopic === 'ALL'}
              aria-label="Tầng 2: Chọn chuyên sâu"
              className={`h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-semibold transition outline-none ${
                selectedTopic === 'ALL'
                  ? 'border-input/50 bg-muted/30 text-muted-foreground cursor-not-allowed'
                  : 'border-primary/50 bg-primary/5 text-primary focus:ring-primary/40 focus:ring-2'
              }`}
            >
              <option value="ALL">
                {selectedTopic === 'ALL' ? '📁 Chọn chủ đề trước' : `📂 Tất cả chuyên đề con`}
              </option>
              {availableSubtopics.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sắp xếp */}
          <div>
            <label className="sr-only">Sắp xếp</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sắp xếp danh sách bài viết"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="newest">🕒 Ngày đăng: Mới nhất</option>
              <option value="interactions">🔥 Điểm tương tác cao nhất</option>
              <option value="views">👁️ Lượt xem: Nhiều nhất</option>
              <option value="likes">❤️ Lượt thích: Nhiều nhất</option>
              <option value="comments">💬 Bình luận: Nhiều nhất</option>
            </select>
          </div>
        </div>

        {/* Hàng chọn nhanh Tab lọc & Tầng 1 */}
        <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-t pt-1">
          <div
            className="border-border bg-muted/60 inline-flex flex-wrap items-center gap-1 rounded-xl border p-1"
            role="tablist"
            aria-label="Nhóm bài viết"
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
              label="Tương tác cao"
              onClick={() => {
                setActiveTab('popular');
                setSortBy('interactions');
              }}
            />
          </div>

          {/* Quick chips Tầng 1 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedTopic('ALL');
                setSelectedSubtopic('ALL');
              }}
              className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${
                selectedTopic === 'ALL'
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              Tất cả
            </button>
            {BLOG_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => {
                  setSelectedTopic(topic.id);
                  setSelectedSubtopic('ALL');
                }}
                className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${
                  selectedTopic === topic.id
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {topic.name}
              </button>
            ))}
          </div>
        </div>

        {/* Thanh trạng thái: Số lượng bài viết + Chuyển đổi Danh sách / Lưới */}
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <span className="text-muted-foreground">
              Hiển thị <strong>{paginatedPosts.length}</strong> /{' '}
              <strong>{filteredPosts.length}</strong> bài viết
            </span>
            {selectedTopic !== 'ALL' && (
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold">
                {activeTopicGroup?.name}
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

      {/* DANH SÁCH BÀI VIẾT HOẶC TRẠNG THÁI TRỐNG */}
      {filteredPosts.length === 0 ? (
        <div className="border-border bg-card/50 mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
          <SlidersHorizontal className="text-muted-foreground/50 mb-3 size-10" />
          <h3 className="text-foreground text-base font-semibold">
            Không tìm thấy bài viết phù hợp
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Không có bài viết nào khớp với từ khóa hoặc điều kiện lọc đã chọn.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium shadow-xs transition-colors"
          >
            <RotateCcw className="size-3.5" /> Xem tất cả bài viết
          </button>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'mt-6',
              view === 'grid' ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-8',
            )}
          >
            {paginatedPosts.map((post) => (
              <PostCard key={post.slug} post={post} variant={view} />
            ))}
          </div>

          <PaginationControl
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            totalItems={filteredPosts.length}
            pageSize={POSTS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
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
        'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all',
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
