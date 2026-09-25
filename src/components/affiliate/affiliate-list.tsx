'use client';

import { useMemo, useState } from 'react';
import { AffiliateCard } from '@/components/affiliate/affiliate-card';
import type { AffiliateCategory, AffiliateItem } from '@prisma/client';
import { PackageSearch, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AffiliateListProps {
  initialDeals: AffiliateItem[];
}

type CategoryFilter = 'ALL' | 'MARKETPLACE' | AffiliateCategory;

const CATEGORY_TABS: { label: string; value: CategoryFilter }[] = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Sàn thương mại', value: 'MARKETPLACE' },
  { label: 'Shopee', value: 'SHOPEE' },
  { label: 'TikTok Shop', value: 'TIKTOK' },
  { label: 'Sàn khác', value: 'SHOPPING' },
  { label: 'VPS & Cloud', value: 'CLOUD' },
  { label: 'Tên miền & DNS', value: 'DOMAIN' },
  { label: 'DevOps & Server', value: 'DEVOPS' },
  { label: 'Công cụ Dev & AI', value: 'DEVTOOLS' },
  { label: 'Bảo mật & VPN', value: 'SECURITY' },
  { label: 'Tool Code', value: 'TOOLCODE' },
];

const MARKETPLACE_CATEGORIES: AffiliateCategory[] = ['SHOPPING', 'SHOPEE', 'TIKTOK'];

export function AffiliateList({ initialDeals }: AffiliateListProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const platforms = useMemo(
    () =>
      Array.from(
        new Set(
          initialDeals
            .map((deal) => deal.platform?.trim())
            .filter((platform): platform is string => Boolean(platform)),
        ),
      ).sort((a, b) => a.localeCompare(b, 'vi')),
    [initialDeals],
  );

  const filteredDeals = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('vi');

    return initialDeals.filter((deal) => {
      const matchCategory =
        selectedCategory === 'ALL' ||
        (selectedCategory === 'MARKETPLACE'
          ? MARKETPLACE_CATEGORIES.includes(deal.category)
          : deal.category === selectedCategory);
      const matchPlatform = selectedPlatform === 'ALL' || deal.platform === selectedPlatform;
      const searchableText = [deal.name, deal.description, deal.platform]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('vi');
      const matchQuery = !normalizedQuery || searchableText.includes(normalizedQuery);

      return matchCategory && matchPlatform && matchQuery;
    });
  }, [initialDeals, searchQuery, selectedCategory, selectedPlatform]);

  const hasActiveFilters =
    selectedCategory !== 'ALL' || selectedPlatform !== 'ALL' || searchQuery.trim() !== '';

  const resetFilters = () => {
    setSelectedCategory('ALL');
    setSelectedPlatform('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      <section
        aria-label="Bộ lọc sản phẩm"
        className="border-border bg-card/70 space-y-4 rounded-2xl border p-4 shadow-sm sm:p-5"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="text-primary size-4" />
          <h2 className="text-sm font-bold">Tìm và lọc sản phẩm</h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <label className="relative block">
            <span className="sr-only">Tìm kiếm sản phẩm</span>
            <Search className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm tên hoặc mô tả sản phẩm..."
              className="h-11 pl-10 text-sm"
            />
          </label>

          <label>
            <span className="sr-only">Lọc theo nền tảng</span>
            <select
              value={selectedPlatform}
              onChange={(event) => setSelectedPlatform(event.target.value)}
              className="border-input bg-background text-foreground focus-visible:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
            >
              <option value="ALL">Tất cả nền tảng</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedCategory(tab.value)}
                aria-pressed={isActive}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="border-border flex items-center justify-between gap-3 border-t pt-3">
          <p className="text-muted-foreground text-xs">
            Hiển thị <strong className="text-foreground">{filteredDeals.length}</strong> sản phẩm
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition"
            >
              <RotateCcw className="size-3.5" /> Đặt lại bộ lọc
            </button>
          )}
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
            className="text-primary mt-4 text-xs font-semibold hover:underline"
          >
            Xem tất cả sản phẩm
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDeals.map((deal) => (
            <AffiliateCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
