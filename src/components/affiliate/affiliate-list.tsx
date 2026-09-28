'use client';

import { useMemo, useState, useSyncExternalStore, useEffect } from 'react';
import { AffiliateCard } from '@/components/affiliate/affiliate-card';
import { ViewSwitcher, type ViewMode } from '@/components/ui/view-switcher';
import { PaginationControl } from '@/components/ui/pagination-control';
import type { AffiliateItem } from '@prisma/client';
import { PackageSearch, RotateCcw, Search, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AffiliateListProps {
  initialDeals: AffiliateItem[];
}

type AffiliateSort = 'featured' | 'newest' | 'name_asc';

const STORAGE_KEY = 'affiliate-view-mode';
const VIEW_CHANGE_EVENT = 'affiliate-view-mode-change';
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

export interface AffiliateSubgroup {
  id: string;
  name: string;
  match: (item: AffiliateItem) => boolean;
}

export interface AffiliateMainGroup {
  id: string;
  name: string;
  match: (item: AffiliateItem) => boolean;
  subgroups: AffiliateSubgroup[];
}

// CẤU TRÚC 2 TẦNG BẬC CHO AFFILIATE: TẦNG 1 (NHÓM NGÀNH) -> TẦNG 2 (SÀN / DỊCH VỤ CHI TIẾT)
export const AFFILIATE_TIERS: AffiliateMainGroup[] = [
  {
    id: 'MARKETPLACE',
    name: '🛍️ Sàn thương mại & Đồ vật lý',
    match: (deal) => {
      const cat = deal.category;
      const s = deal.slug.toLowerCase();
      const p = (deal.platform || '').toLowerCase();
      return (
        cat === 'SHOPEE' ||
        cat === 'TIKTOK' ||
        cat === 'SHOPPING' ||
        p.includes('shopee') ||
        p.includes('tiktok') ||
        s.includes('shopee') ||
        s.includes('tiktok') ||
        s.includes('ban-phim') ||
        s.includes('mic')
      );
    },
    subgroups: [
      {
        id: 'SHOPEE',
        name: '🧡 Sàn Shopee (Freeship & Voucher)',
        match: (deal) =>
          deal.category === 'SHOPEE' ||
          (deal.platform || '').toLowerCase().includes('shopee') ||
          deal.slug.includes('shopee'),
      },
      {
        id: 'TIKTOK',
        name: '⚫ TikTok Shop (Flash Sale & Review)',
        match: (deal) =>
          deal.category === 'TIKTOK' ||
          (deal.platform || '').toLowerCase().includes('tiktok') ||
          deal.slug.includes('tiktok'),
      },
      {
        id: 'GEAR',
        name: '⌨️ Bàn phím & Phụ kiện PC',
        match: (deal) =>
          deal.name.toLowerCase().includes('bàn phím') || deal.slug.includes('ban-phim'),
      },
    ],
  },
  {
    id: 'CLOUD',
    name: '☁️ Hạ tầng Cloud VPS & Máy chủ',
    match: (deal) =>
      deal.category === 'CLOUD' ||
      (deal.platform || '').toLowerCase().includes('cloud') ||
      deal.slug.includes('hetzner') ||
      deal.slug.includes('digitalocean'),
    subgroups: [
      {
        id: 'HETZNER',
        name: '🔴 Hetzner Cloud (VPS Hiệu năng cao)',
        match: (deal) =>
          deal.slug.includes('hetzner') || (deal.platform || '').toLowerCase().includes('hetzner'),
      },
      {
        id: 'DIGITALOCEAN',
        name: '🔵 DigitalOcean (Managed Cloud & K8s)',
        match: (deal) =>
          deal.slug.includes('digitalocean') ||
          (deal.platform || '').toLowerCase().includes('digitalocean'),
      },
    ],
  },
  {
    id: 'DEVTOOLS',
    name: '🛠️ Công cụ Lập trình & AI Editor',
    match: (deal) =>
      deal.category === 'DEVTOOLS' || deal.category === 'TOOLCODE' || deal.slug.includes('cursor'),
    subgroups: [
      {
        id: 'CURSOR',
        name: '🤖 Cursor AI Code Editor',
        match: (deal) => deal.slug.includes('cursor') || deal.name.toLowerCase().includes('cursor'),
      },
    ],
  },
];

export function AffiliateList({ initialDeals }: AffiliateListProps) {
  const view = useSyncExternalStore(subscribeToView, getSavedView, getServerView);

  // States lọc 2 tầng
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMainTier, setSelectedMainTier] = useState<string>('ALL');
  const [selectedSubTier, setSelectedSubTier] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<AffiliateSort>('featured');
  const [currentPage, setCurrentPage] = useState(1);

  const activeMainGroup = useMemo(() => {
    return AFFILIATE_TIERS.find((t) => t.id === selectedMainTier);
  }, [selectedMainTier]);

  const availableSubgroups = useMemo(() => {
    return activeMainGroup ? activeMainGroup.subgroups : [];
  }, [activeMainGroup]);

  const filteredDeals = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('vi');

    const result = initialDeals.filter((deal) => {
      // 1. Tìm kiếm từ khóa
      const searchableText = [deal.name, deal.description, deal.platform]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('vi');
      const matchQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
      if (!matchQuery) return false;

      // 2. Lọc theo Tầng 1: Nhóm ngành
      if (selectedMainTier !== 'ALL' && activeMainGroup) {
        if (!activeMainGroup.match(deal)) return false;

        // 3. Lọc theo Tầng 2: Sàn / Dịch vụ con
        if (selectedSubTier !== 'ALL') {
          const sub = activeMainGroup.subgroups.find((s) => s.id === selectedSubTier);
          if (sub && !sub.match(deal)) return false;
        }
      }

      return true;
    });

    // Sắp xếp
    result.sort((a, b) => {
      if (sortBy === 'featured') {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'vi');
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [initialDeals, searchQuery, selectedMainTier, activeMainGroup, selectedSubTier, sortBy]);

  // Đặt lại trang khi thay đổi tìm kiếm hoặc bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMainTier, selectedSubTier, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedDeals = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredDeals.slice(start, start + PAGE_SIZE);
  }, [filteredDeals, safeCurrentPage]);

  const hasActiveFilters =
    selectedMainTier !== 'ALL' ||
    selectedSubTier !== 'ALL' ||
    searchQuery.trim() !== '' ||
    sortBy !== 'featured';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMainTier('ALL');
    setSelectedSubTier('ALL');
    setSortBy('featured');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* KHUNG BỘ LỌC 2 TẦNG BẬC CHO AFFILIATE */}
      <section
        aria-label="Bộ lọc sản phẩm"
        className="border-border bg-card/70 space-y-4 rounded-2xl border p-4 shadow-xs sm:p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-primary size-4" />
            <h2 className="text-sm font-bold">Tìm kiếm & Bộ lọc Deal 2 tầng bậc</h2>
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

        {/* Lưới Listbox 2 Tầng */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Ô tìm kiếm */}
          <div className="relative">
            <span className="sr-only">Tìm kiếm sản phẩm</span>
            <Search className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm tên hoặc mô tả deal..."
              className="h-10 pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* TẦNG 1: NHÓM NGÀNH HÀNG (Listbox) */}
          <div>
            <label className="sr-only">Tầng 1: Chọn nhóm ngành</label>
            <select
              value={selectedMainTier}
              onChange={(e) => {
                setSelectedMainTier(e.target.value);
                setSelectedSubTier('ALL'); // Reset tầng 2
              }}
              aria-label="Tầng 1: Chọn nhóm ngành"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="ALL">🏪 Tất cả nhóm ngành / dịch vụ</option>
              {AFFILIATE_TIERS.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
            </select>
          </div>

          {/* TẦNG 2: SÀN / DỊCH VỤ CHI TIẾT (Tự động đổi theo Tầng 1) */}
          <div>
            <label className="sr-only">Tầng 2: Chọn sàn hoặc dịch vụ</label>
            <select
              value={selectedSubTier}
              onChange={(e) => setSelectedSubTier(e.target.value)}
              disabled={selectedMainTier === 'ALL'}
              aria-label="Tầng 2: Chọn dịch vụ con"
              className={`h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-semibold transition outline-none ${
                selectedMainTier === 'ALL'
                  ? 'border-input/50 bg-muted/30 text-muted-foreground cursor-not-allowed'
                  : 'border-primary/50 bg-primary/5 text-primary focus:ring-primary/40 focus:ring-2'
              }`}
            >
              <option value="ALL">
                {selectedMainTier === 'ALL'
                  ? '📁 Chọn nhóm ngành trước'
                  : `📂 Tất cả ${activeMainGroup?.name.split(' ')[1] || 'dịch vụ'}`}
              </option>
              {availableSubgroups.map((sub) => (
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
              onChange={(e) => setSortBy(e.target.value as AffiliateSort)}
              aria-label="Sắp xếp deal"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="featured">🔥 Ưu đãi nổi bật nhất</option>
              <option value="newest">🕒 Mới cập nhật</option>
              <option value="name_asc">🔤 Tên deal: A - Z</option>
            </select>
          </div>
        </div>

        {/* Footer thống kê + View switcher */}
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="text-muted-foreground">
              Hiển thị <strong>{paginatedDeals.length}</strong> /{' '}
              <strong>{filteredDeals.length}</strong> sản phẩm
            </span>
            {selectedMainTier !== 'ALL' && (
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold">
                {activeMainGroup?.name}
                {selectedSubTier !== 'ALL' && (
                  <>
                    <ChevronRight className="size-3" />
                    {availableSubgroups.find((s) => s.id === selectedSubTier)?.name}
                  </>
                )}
              </span>
            )}
          </div>

          <ViewSwitcher view={view} onChange={saveView} size="sm" />
        </div>
      </section>

      {filteredDeals.length === 0 ? (
        <div className="border-border rounded-2xl border border-dashed p-12 text-center">
          <PackageSearch className="text-muted-foreground mx-auto size-10 stroke-1" />
          <h3 className="mt-3 text-sm font-semibold">Không tìm thấy sản phẩm phù hợp</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Hãy thử từ khóa khác hoặc đặt lại bộ lọc.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="text-primary mt-4 cursor-pointer text-xs font-semibold hover:underline"
          >
            Xem tất cả sản phẩm
          </button>
        </div>
      ) : (
        <div
          className={
            view === 'grid'
              ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'flex flex-col gap-3'
          }
        >
          {paginatedDeals.map((deal) => (
            <AffiliateCard key={deal.id} deal={deal} variant={view} />
          ))}
        </div>
      )}

      <PaginationControl
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        totalItems={filteredDeals.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
