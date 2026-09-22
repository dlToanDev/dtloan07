'use client';

import { useState, useMemo } from 'react';
import { AffiliateCard } from '@/components/affiliate/affiliate-card';
import { AffiliateCategory, AffiliateItem } from '@prisma/client';
import { Search, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AffiliateListProps {
  initialDeals: AffiliateItem[];
}

const CATEGORY_TABS: { label: string; value: 'ALL' | AffiliateCategory }[] = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'VPS & Cloud', value: 'CLOUD' },
  { label: 'Tên miền & DNS', value: 'DOMAIN' },
  { label: 'DevOps & Server', value: 'DEVOPS' },
  { label: 'Công cụ Dev & AI', value: 'DEVTOOLS' },
  { label: 'Bảo mật & VPN', value: 'SECURITY' },
  { label: 'Mua sắm', value: 'SHOPPING' },
];

export function AffiliateList({ initialDeals }: AffiliateListProps) {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | AffiliateCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDeals = useMemo(() => {
    return initialDeals.filter((deal) => {
      const matchCategory = selectedCategory === 'ALL' || deal.category === selectedCategory;
      const matchQuery =
        searchQuery.trim() === '' ||
        deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (deal.perks && deal.perks.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchQuery;
    });
  }, [initialDeals, selectedCategory, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Bộ lọc tabs & Thanh tìm kiếm */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedCategory(tab.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm công cụ, VPS..."
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Grid danh sách Deals */}
      {filteredDeals.length === 0 ? (
        <div className="border-border rounded-2xl border border-dashed p-12 text-center">
          <Tag className="text-muted-foreground mx-auto size-10 stroke-1" />
          <h4 className="mt-3 text-sm font-semibold">Không tìm thấy ưu đãi phù hợp</h4>
          <p className="text-muted-foreground mt-1 text-xs">
            Thử thay đổi danh mục hoặc từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDeals.map((deal) => (
            <AffiliateCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
