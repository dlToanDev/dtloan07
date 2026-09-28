'use client';

import { useState, useMemo, useSyncExternalStore, useEffect } from 'react';
import { ProductCard } from '@/components/shop/product-card';
import { ViewSwitcher, type ViewMode } from '@/components/ui/view-switcher';
import { PaginationControl } from '@/components/ui/pagination-control';
import { summarizeVariants } from '@/lib/shop/variants';
import { Input } from '@/components/ui/input';
import type { Prisma } from '@prisma/client';
import { PackageSearch, RotateCcw, Search, SlidersHorizontal, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'shop-product-view';
const VIEW_CHANGE_EVENT = 'shop-product-view-change';
const PAGE_SIZE = 10;

type ShopProduct = Prisma.ProductGetPayload<{
  include: {
    category: true;
    variants: {
      include: {
        _count: { select: { accountStock: { where: { status: 'AVAILABLE' } } } };
      };
    };
  };
}>;
type ShopCategory = { id: string; name: string; slug: string; hasCondition: boolean };
type ShopFilterProduct = Pick<ShopProduct, 'slug' | 'name' | 'categoryId' | 'type' | 'category'>;

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

export type PriceRange = 'ALL' | 'FREE' | 'UNDER_200' | '200_500' | '500_1000' | 'ABOVE_1000';
export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'discount';

export interface SubCategoryConfig {
  id: string;
  name: string;
  match: (product: ShopFilterProduct) => boolean;
}

export interface MainGroupConfig {
  id: string;
  name: string;
  match: (product: ShopFilterProduct) => boolean;
  subcategories: SubCategoryConfig[];
}

// CẤU TRÚC 2 TẦNG: TẦNG 1 (LOẠI HÀNG CHÍNH) -> TẦNG 2 (DANH MỤC CON CHI TIẾT)
export const SHOP_TIERS: MainGroupConfig[] = [
  {
    id: 'FASHION',
    name: '👕 Thời trang',
    match: (p) => {
      const cat = p.category?.slug || '';
      const catId = p.categoryId || '';
      const slug = p.slug || '';
      const name = (p.name || '').toLowerCase();
      return (
        cat === 'thoi-trang' ||
        cat === 'quan-ao' ||
        cat === 'mu' ||
        catId === 'cat_apparel' ||
        catId === 'cat_hat' ||
        slug.startsWith('ao-') ||
        slug.startsWith('quan-') ||
        slug.startsWith('mu-') ||
        name.includes('áo') ||
        name.includes('quần') ||
        name.includes('mũ')
      );
    },
    subcategories: [
      {
        id: 'SHIRT',
        name: '👕 Áo (Hoodie, Thun, Polo)',
        match: (p) => {
          const s = (p.slug || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          return (
            s.includes('ao-') || n.includes('áo') || n.includes('hoodie') || n.includes('thun')
          );
        },
      },
      {
        id: 'PANTS',
        name: '👖 Quần (Jogger, Short, Kaki)',
        match: (p) => {
          const s = (p.slug || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          return (
            s.includes('quan-') || n.includes('quần') || n.includes('jogger') || n.includes('short')
          );
        },
      },
      {
        id: 'HAT',
        name: '🧢 Mũ & Nón',
        match: (p) => {
          const s = (p.slug || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          return (
            s.includes('mu-') || n.includes('mũ') || n.includes('nón') || p.categoryId === 'cat_hat'
          );
        },
      },
    ],
  },
  {
    id: 'TECH',
    name: '🎧 Đồ công nghệ & Setup',
    match: (p) => {
      const cat = p.category?.slug || '';
      const catId = p.categoryId || '';
      const s = (p.slug || '').toLowerCase();
      const n = (p.name || '').toLowerCase();
      return (
        cat === 'do-cong-nghe' ||
        cat === 'coc' ||
        cat === 'phu-kien' ||
        catId === 'cat_tech' ||
        catId === 'cat_mug' ||
        catId === 'cat_accessory' ||
        s.includes('ban-phim') ||
        s.includes('lot-chuot') ||
        s.includes('coc-') ||
        n.includes('bàn phím') ||
        n.includes('lót chuột') ||
        n.includes('cốc')
      );
    },
    subcategories: [
      {
        id: 'KEYBOARD',
        name: '⌨️ Bàn phím cơ',
        match: (p) => {
          const s = (p.slug || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          return s.includes('ban-phim') || s.includes('keychron') || n.includes('bàn phím');
        },
      },
      {
        id: 'MOUSE_PAD',
        name: '🖱️ Chuột & Lót chuột',
        match: (p) => {
          const s = (p.slug || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          return (
            s.includes('lot-chuot') ||
            s.includes('chuot') ||
            n.includes('lót chuột') ||
            n.includes('chuột')
          );
        },
      },
      {
        id: 'DECOR',
        name: '☕ Cốc sứ & Decor bàn làm việc',
        match: (p) => {
          const s = (p.slug || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          return s.includes('coc-') || n.includes('cốc');
        },
      },
    ],
  },
  {
    id: 'SOURCE_CODE',
    name: '💻 Source Code & Mã nguồn',
    match: (p) => {
      const cat = p.category?.slug || '';
      const catId = p.categoryId || '';
      return p.type === 'DOWNLOAD' || cat === 'source-code' || catId === 'cat_source_code';
    },
    subcategories: [
      {
        id: 'SAAS',
        name: '🚀 SaaS & Fullstack Starter',
        match: (p) => {
          const s = (p.slug || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          return s.includes('saas') || n.includes('saas') || n.includes('fullstack');
        },
      },
      {
        id: 'DEVOPS_TEMPLATE',
        name: '🌐 Nginx & Docker Starter',
        match: (p) => {
          const s = (p.slug || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          return (
            s.includes('nginx') ||
            s.includes('docker') ||
            n.includes('nginx') ||
            n.includes('docker')
          );
        },
      },
      {
        id: 'MICROSERVICES',
        name: '⚡ Microservices & Backend',
        match: (p) => {
          const s = (p.slug || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          return s.includes('microservices') || n.includes('microservices') || n.includes('nestjs');
        },
      },
    ],
  },
  {
    id: 'ACCOUNT',
    name: '🔑 Tài khoản bản quyền',
    match: (p) => {
      const cat = p.category?.slug || '';
      const catId = p.categoryId || '';
      return p.type === 'ACCOUNT' || cat === 'tai-khoan' || catId === 'cat_account';
    },
    subcategories: [
      {
        id: 'AI_CHAT',
        name: '🤖 ChatGPT Plus & AI',
        match: (p) => {
          const s = (p.slug || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          return s.includes('chatgpt') || s.includes('openai') || n.includes('chatgpt');
        },
      },
      {
        id: 'DEV_AI',
        name: '💻 Cursor Pro & Copilot',
        match: (p) => {
          const s = (p.slug || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          return (
            s.includes('cursor') ||
            s.includes('copilot') ||
            n.includes('cursor') ||
            n.includes('copilot')
          );
        },
      },
    ],
  },
];

export interface ShopProductListProps {
  products: ShopProduct[];
  categories?: ShopCategory[];
  initialCategorySlug?: string;
}

export function ShopProductList({ products, initialCategorySlug = 'all' }: ShopProductListProps) {
  const view = useSyncExternalStore(subscribeToView, getSavedView, getServerView);

  // States lọc 2 tầng
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMainTier, setSelectedMainTier] = useState<string>('ALL');
  const [selectedSubTier, setSelectedSubTier] = useState<string>('ALL');
  const [priceRange, setPriceRange] = useState<PriceRange>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Khởi tạo theo initialCategorySlug nếu có
  useEffect(() => {
    if (initialCategorySlug && initialCategorySlug !== 'all') {
      const found = SHOP_TIERS.find(
        (t) =>
          t.id.toLowerCase() === initialCategorySlug.toLowerCase() ||
          t.name.toLowerCase().includes(initialCategorySlug.toLowerCase()),
      );
      if (found) {
        setSelectedMainTier(found.id);
        setSelectedSubTier('ALL');
      }
    }
  }, [initialCategorySlug]);

  // Nhóm đang chọn ở Tầng 1
  const activeMainGroup = useMemo(() => {
    return SHOP_TIERS.find((t) => t.id === selectedMainTier);
  }, [selectedMainTier]);

  // Danh mục con có sẵn theo Tầng 1
  const availableSubcategories = useMemo(() => {
    return activeMainGroup ? activeMainGroup.subcategories : [];
  }, [activeMainGroup]);

  // Reset trang về 1 khi bất kỳ điều kiện lọc nào thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMainTier, selectedSubTier, priceRange, sortBy]);

  // Lọc và sắp xếp sản phẩm
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Tìm kiếm từ khóa (tên, mô tả, slug)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((p) => {
        const titleMatch = (p.name || '').toLowerCase().includes(q);
        const descMatch = (p.shortDesc || '').toLowerCase().includes(q);
        const slugMatch = (p.slug || '').toLowerCase().includes(q);
        return titleMatch || descMatch || slugMatch;
      });
    }

    // 2. Lọc theo Tầng 1: Loại hàng chính
    if (selectedMainTier !== 'ALL' && activeMainGroup) {
      result = result.filter((p) => activeMainGroup.match(p));

      // 3. Lọc theo Tầng 2: Danh mục con chi tiết (Quần, Áo, Bàn phím...)
      if (selectedSubTier !== 'ALL') {
        const subConfig = activeMainGroup.subcategories.find((s) => s.id === selectedSubTier);
        if (subConfig) {
          result = result.filter((p) => subConfig.match(p));
        }
      }
    }

    // 4. Lọc theo khoảng giá
    if (priceRange !== 'ALL') {
      result = result.filter((p) => {
        const price = p.priceVnd;
        if (priceRange === 'FREE') return price === 0 || p.saleMode === 'FREE';
        if (priceRange === 'UNDER_200') return price > 0 && price < 200000;
        if (priceRange === '200_500') return price >= 200000 && price <= 500000;
        if (priceRange === '500_1000') return price > 500000 && price <= 1000000;
        if (priceRange === 'ABOVE_1000') return price > 1000000;
        return true;
      });
    }

    // 5. Sắp xếp
    result.sort((a, b) => {
      if (sortBy === 'price_asc') return a.priceVnd - b.priceVnd;
      if (sortBy === 'price_desc') return b.priceVnd - a.priceVnd;
      if (sortBy === 'discount') {
        const discountA =
          a.compareAtVnd && a.compareAtVnd > a.priceVnd ? a.compareAtVnd - a.priceVnd : 0;
        const discountB =
          b.compareAtVnd && b.compareAtVnd > b.priceVnd ? b.compareAtVnd - b.priceVnd : 0;
        return discountB - discountA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [
    products,
    searchQuery,
    selectedMainTier,
    activeMainGroup,
    selectedSubTier,
    priceRange,
    sortBy,
  ]);

  // Kiểm tra có đang áp dụng bộ lọc nào không
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedMainTier !== 'ALL' ||
    selectedSubTier !== 'ALL' ||
    priceRange !== 'ALL' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMainTier('ALL');
    setSelectedSubTier('ALL');
    setPriceRange('ALL');
    setSortBy('newest');
    setCurrentPage(1);
  };

  // Tính toán phân trang (10 sản phẩm mỗi trang)
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, safeCurrentPage]);

  return (
    <div className="space-y-6">
      {/* KHUNG BỘ LỌC 2 TẦNG BẬC CHUẨN */}
      <section
        aria-label="Bộ lọc sản phẩm Shop"
        className="border-border bg-card/70 space-y-4 rounded-2xl border p-4 shadow-xs sm:p-5"
      >
        {/* Header Bộ lọc & Nút đặt lại */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-primary size-4" />
            <h2 className="text-sm font-bold">Tìm kiếm & Bộ lọc 2 tầng bậc</h2>
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

        {/* LƯỚI BỘ LỌC LISTBOX 2 TẦNG */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Ô tìm kiếm từ khóa */}
          <div className="relative">
            <span className="sr-only">Tìm kiếm sản phẩm</span>
            <Search className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mô tả..."
              className="h-10 pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* 2. TẦNG 1: CHỌN LOẠI HÀNG CHÍNH (Listbox) */}
          <div>
            <label className="sr-only">Chọn loại hàng chính</label>
            <select
              value={selectedMainTier}
              onChange={(e) => {
                setSelectedMainTier(e.target.value);
                setSelectedSubTier('ALL'); // Reset danh mục con khi đổi loại hàng
              }}
              aria-label="Tầng 1: Chọn loại hàng chính"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="ALL">📦 Tất cả loại hàng</option>
              {SHOP_TIERS.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. TẦNG 2: DANH MỤC CON CHI TIẾT (Tự động đổi theo Tầng 1) */}
          <div>
            <label className="sr-only">Chọn danh mục con chi tiết</label>
            <select
              value={selectedSubTier}
              onChange={(e) => setSelectedSubTier(e.target.value)}
              disabled={selectedMainTier === 'ALL'}
              aria-label="Tầng 2: Chọn danh mục con"
              className={`h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-semibold transition outline-none ${
                selectedMainTier === 'ALL'
                  ? 'border-input/50 bg-muted/30 text-muted-foreground cursor-not-allowed'
                  : 'border-primary/50 bg-primary/5 text-primary focus:ring-primary/40 focus:ring-2'
              }`}
            >
              <option value="ALL">
                {selectedMainTier === 'ALL'
                  ? '📁 Chọn loại hàng trước'
                  : `📂 Tất cả ${activeMainGroup?.name.split(' ')[1] || 'chi tiết'}`}
              </option>
              {availableSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Khoảng giá */}
          <div>
            <label className="sr-only">Khoảng giá</label>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value as PriceRange)}
              aria-label="Khoảng giá"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="ALL">💰 Mọi mức giá</option>
              <option value="FREE">🎉 Miễn phí</option>
              <option value="UNDER_200">Dưới 200.000 đ</option>
              <option value="200_500">200.000 đ - 500.000 đ</option>
              <option value="500_1000">500.000 đ - 1.000.000 đ</option>
              <option value="ABOVE_1000">Trên 1.000.000 đ</option>
            </select>
          </div>

          {/* 5. Sắp xếp */}
          <div>
            <label className="sr-only">Sắp xếp</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sắp xếp sản phẩm"
              className="border-input bg-background text-foreground focus:ring-primary/40 h-10 w-full cursor-pointer rounded-md border px-3 text-xs font-medium outline-none focus:ring-2"
            >
              <option value="newest">🕒 Mới nhất</option>
              <option value="price_asc">⬆️ Giá: Thấp đến cao</option>
              <option value="price_desc">⬇️ Giá: Cao đến thấp</option>
              <option value="discount">🔥 Giảm giá nhiều nhất</option>
            </select>
          </div>
        </div>

        {/* CÁC NÚT CHỌN NHANH TẦNG 1 & TẦNG 2 */}
        <div className="border-border/60 space-y-2 border-t pt-1">
          {/* Tầng 1 Quick Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground mr-1 text-xs font-medium">Loại hàng:</span>
            <button
              type="button"
              onClick={() => {
                setSelectedMainTier('ALL');
                setSelectedSubTier('ALL');
              }}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition ${
                selectedMainTier === 'ALL'
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              Tất cả
            </button>
            {SHOP_TIERS.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => {
                  setSelectedMainTier(tier.id);
                  setSelectedSubTier('ALL');
                }}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  selectedMainTier === tier.id
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {tier.name}
              </button>
            ))}
          </div>

          {/* Tầng 2 Quick Chips: Khi chọn Loại hàng thì hiện các chip con */}
          {selectedMainTier !== 'ALL' && availableSubcategories.length > 0 && (
            <div className="border-primary/40 animate-in fade-in flex flex-wrap items-center gap-1.5 border-l-2 pl-2 duration-200">
              <span className="text-primary text-xs font-semibold">Chi tiết:</span>
              <button
                type="button"
                onClick={() => setSelectedSubTier('ALL')}
                className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                  selectedSubTier === 'ALL'
                    ? 'border-primary bg-primary/20 text-primary font-bold'
                    : 'border-border text-muted-foreground hover:text-foreground border-dashed'
                }`}
              >
                Tất cả
              </button>
              {availableSubcategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubTier(sub.id)}
                  className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                    selectedSubTier === sub.id
                      ? 'border-primary bg-primary/20 text-primary font-bold shadow-xs'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Thông tin đang lọc + View Switcher */}
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="text-muted-foreground">
              Hiển thị <strong>{paginatedProducts.length}</strong> /{' '}
              <strong>{filteredProducts.length}</strong> sản phẩm
            </span>
            {selectedMainTier !== 'ALL' && (
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold">
                {activeMainGroup?.name}
                {selectedSubTier !== 'ALL' && (
                  <>
                    <ChevronRight className="size-3" />
                    {availableSubcategories.find((s) => s.id === selectedSubTier)?.name}
                  </>
                )}
              </span>
            )}
          </div>

          <ViewSwitcher view={view} onChange={saveView} size="sm" />
        </div>
      </section>

      {/* DANH SÁCH SẢN PHẨM HOẶC TRẠNG THÁI TRỐNG */}
      {filteredProducts.length === 0 ? (
        <div className="border-border rounded-2xl border border-dashed p-12 text-center">
          <PackageSearch className="text-muted-foreground mx-auto size-10 stroke-1" />
          <h3 className="mt-3 text-sm font-semibold">Không tìm thấy sản phẩm nào</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Không có sản phẩm nào khớp với điều kiện tìm kiếm hoặc lọc hiện tại.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="text-primary mt-4 cursor-pointer text-xs font-semibold hover:underline"
          >
            Xóa bộ lọc & xem tất cả
          </button>
        </div>
      ) : (
        <div
          className={
            view === 'grid' ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-4'
          }
        >
          {paginatedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant={view}
              shop={{
                type: product.type,
                condition: product.condition,
                summary: summarizeVariants(
                  product.variants.map((variant) => ({
                    ...variant,
                    stock:
                      product.type === 'ACCOUNT' && product.deliveryMode === 'AUTO'
                        ? (variant._count?.accountStock ?? variant.stock)
                        : variant.stock,
                  })),
                ),
              }}
            />
          ))}
        </div>
      )}

      {/* Phân trang: Đánh số 1, 2, 3... nếu nhiều hơn 10 sản phẩm */}
      <PaginationControl
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        totalItems={filteredProducts.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
