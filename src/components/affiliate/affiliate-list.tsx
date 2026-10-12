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
const PAGE_SIZE = 12;

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

function resolvePlatform(deal: AffiliateItem): string {
  if (deal.platform && deal.platform.trim()) return deal.platform.trim();
  if (deal.category === 'SHOPEE') return 'Shopee';
  if (deal.category === 'TIKTOK') return 'TikTok Shop';
  return 'Khác';
}

export function AffiliateList({ initialDeals }: AffiliateListProps) {
  const view = useSyncExternalStore(subscribeToView, getSavedView, getServerView);

  // States bộ lọc mua sắm: Sàn thương mại -> Danh mục hàng hóa
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<AffiliateSort>('featured');
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Danh sách Sàn thực tế có sản phẩm trong hệ thống
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    initialDeals.forEach((deal) => {
      const p = resolvePlatform(deal);
      if (p) set.add(p);
    });
    return Array.from(set).sort((a, b) => {
      if (a.toLowerCase().includes('shopee')) return -1;
      if (b.toLowerCase().includes('shopee')) return 1;
      if (a.toLowerCase().includes('tiktok')) return -1;
      if (b.toLowerCase().includes('tiktok')) return 1;
      return a.localeCompare(b, 'vi');
    });
  }, [initialDeals]);

  // 2. Danh sách Danh mục hàng hóa thực tế theo sàn đang chọn
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    const targetDeals =
      selectedPlatform === 'ALL'
        ? initialDeals
        : initialDeals.filter(
            (deal) => resolvePlatform(deal).toLowerCase() === selectedPlatform.toLowerCase(),
          );

    targetDeals.forEach((deal) => {
      const c = deal.subCategory?.trim();
      if (c) {
        set.add(c);
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [initialDeals, selectedPlatform]);

  // 3. Lọc danh sách deal
  const filteredDeals = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('vi');

    const result = initialDeals.filter((deal) => {
      // Tìm kiếm từ khóa
      const searchableText = [
        deal.name,
        deal.description,
        deal.platform,
        deal.subCategory,
        deal.perks,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('vi');
      const matchQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
      if (!matchQuery) return false;

      // Lọc theo Sàn thương mại
      if (selectedPlatform !== 'ALL') {
        const p = resolvePlatform(deal);
        if (p.toLowerCase() !== selectedPlatform.toLowerCase()) return false;
      }

      // Lọc theo Danh mục hàng hóa
      if (selectedCategory !== 'ALL') {
        const c = deal.subCategory?.trim() || '';
        if (c.toLowerCase() !== selectedCategory.toLowerCase()) return false;
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
  }, [initialDeals, searchQuery, selectedPlatform, selectedCategory, sortBy]);

  // Đặt lại trang khi thay đổi tìm kiếm hoặc bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlatform, selectedCategory, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedDeals = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredDeals.slice(start, start + PAGE_SIZE);
  }, [filteredDeals, safeCurrentPage]);

  const hasActiveFilters =
    selectedPlatform !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    searchQuery.trim() !== '' ||
    sortBy !== 'featured';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedPlatform('ALL');
    setSelectedCategory('ALL');
    setSortBy('featured');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* BỘ LỌC DEAL MUA SẮM */}
      <section
        aria-label="Bộ lọc sản phẩm mua sắm"
        className="border-border bg-card/70 space-y-4 rounded-2xl border p-4 shadow-xs sm:p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-primary size-4" />
            <h2 className="text-sm font-bold">Bộ lọc deal mua sắm</h2>
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

        {/* Lưới Bộ Lọc: Từ khóa | Sàn thương mại | Ngành hàng | Sắp xếp */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Ô tìm kiếm */}
          <div className="relative">
            <span className="sr-only">Tìm kiếm sản phẩm</span>
            <Search className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm theo tên sản phẩm, từ khóa..."
              className="h-10 pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* SÀN THƯƠNG MẠI */}
          <div>
            <label className="sr-only">Chọn sàn thương mại</label>
            <select
              value={selectedPlatform}
              onChange={(e) => {
                setSelectedPlatform(e.target.value);
                setSelectedCategory('ALL');
              }}
              aria-label="Chọn sàn thương mại"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="ALL">Tất cả sàn mua sắm</option>
              {availablePlatforms.map((plat) => (
                <option key={plat} value={plat}>
                  {plat}
                </option>
              ))}
            </select>
          </div>

          {/* NGÀNH HÀNG / DANH MỤC */}
          <div>
            <label className="sr-only">Chọn danh mục ngành hàng</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={availableCategories.length === 0}
              aria-label="Chọn danh mục sản phẩm"
              className={`h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-semibold transition outline-none ${
                availableCategories.length === 0
                  ? 'border-input/50 bg-muted/30 text-muted-foreground cursor-not-allowed'
                  : 'border-primary/50 bg-primary/5 text-primary focus:ring-primary/40 focus:ring-2'
              }`}
            >
              <option value="ALL">
                {availableCategories.length === 0
                  ? 'Chưa có ngành hàng'
                  : selectedPlatform === 'ALL'
                    ? 'Tất cả ngành hàng'
                    : `Tất cả ngành hàng (${selectedPlatform})`}
              </option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* SẮP XẾP */}
          <div>
            <label className="sr-only">Sắp xếp ưu đãi</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as AffiliateSort)}
              aria-label="Sắp xếp sản phẩm"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="featured">Ưu đãi nổi bật</option>
              <option value="newest">Mới cập nhật</option>
              <option value="name_asc">Tên sản phẩm (A - Z)</option>
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
            {selectedPlatform !== 'ALL' && (
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold">
                Sàn: {selectedPlatform}
                {selectedCategory !== 'ALL' && (
                  <>
                    <ChevronRight className="size-3" />
                    {selectedCategory}
                  </>
                )}
              </span>
            )}
          </div>

          <ViewSwitcher view={view} onChange={saveView} size="sm" />
        </div>
      </section>

      {/* DANH SÁCH SẢN PHẨM HOẶC EMPTY STATE */}
      {initialDeals.length === 0 ? (
        <div className="border-border rounded-2xl border border-dashed p-12 text-center">
          <PackageSearch className="text-muted-foreground mx-auto size-10 stroke-1" />
          <h3 className="mt-3 text-sm font-semibold">Chưa có sản phẩm nào được cập nhật</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Các sản phẩm ưu đãi từ Shopee, TikTok Shop sẽ sớm được cập nhật tại đây. Hãy quay lại
            sau nhé!
          </p>
        </div>
      ) : filteredDeals.length === 0 ? (
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
