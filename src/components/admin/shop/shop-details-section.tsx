'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CONDITION_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  type ItemConditionValue,
  type ProductTypeOption,
} from '@/lib/shop/labels';
import { createCategory } from '@/server/actions/product-category';
import { safeAction } from '@/lib/courses/safe-action';

export interface ShopDetailsValue {
  type: ProductTypeOption | '';
  /** id danh mục (bảng ProductCategory). */
  category: string;
  condition: ItemConditionValue | '';
  conditionNote: string;
  warrantyNote: string;
  deliveryMode: 'AUTO' | 'MANUAL' | '';
}

type Props = {
  value: ShopDetailsValue;
  onChange: (patch: Partial<ShopDetailsValue>) => void;
};

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2.5 text-sm';

export const DELIVERY_OPTIONS = [
  {
    value: 'AUTO' as const,
    label: '⚡ Tự động gửi ngay',
    hint: 'Hệ thống lấy 1 tài khoản trong kho gửi cho khách ngay khi thanh toán xong.',
  },
  {
    value: 'MANUAL' as const,
    label: '✋ Tôi tự gửi',
    hint: 'Bạn nhận thông báo đơn và tự gửi thông tin tài khoản cho khách.',
  },
];

export function ChoiceCard({
  selected,
  disabled,
  label,
  hint,
  onClick,
}: {
  selected: boolean;
  disabled?: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
        selected
          ? 'border-primary bg-primary/5 ring-primary ring-1'
          : 'border-border hover:bg-muted/40'
      }`}
    >
      <span className="block font-semibold">{label}</span>
      <span className="text-muted-foreground text-xs">{hint}</span>
    </button>
  );
}

/** Loại hàng. Cách bàn giao tài khoản số nằm ở thẻ "Thông tin tài khoản" nhưng gửi kèm ở đây. */
export function ProductTypeStep({ value, onChange, typeLocked }: Props & { typeLocked: boolean }) {
  return (
    <div className="space-y-4">
      <input type="hidden" name="type" value={value.type} />
      <input
        type="hidden"
        name="deliveryMode"
        value={value.type === 'ACCOUNT' ? value.deliveryMode : ''}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        {PRODUCT_TYPE_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.value}
            selected={value.type === option.value}
            disabled={typeLocked && option.value !== value.type}
            label={option.label}
            hint={option.hint}
            onClick={() =>
              onChange({
                type: option.value,
                // Tài khoản số mặc định gửi tự động.
                ...(option.value === 'ACCOUNT' && {
                  deliveryMode: value.deliveryMode || ('AUTO' as const),
                }),
              })
            }
          />
        ))}
      </div>
      {typeLocked && (
        <p className="text-muted-foreground text-xs">
          Sản phẩm đã có đơn hàng nên không đổi loại hàng được.
        </p>
      )}
    </div>
  );
}

export interface CategoryOption {
  id: string;
  name: string;
  hasCondition: boolean;
}

/** Ô chọn danh mục + thêm danh mục mới ngay tại chỗ (không phải rời trang). */
function CategoryPicker({
  value,
  categories,
  onChange,
  onCreated,
}: {
  value: string;
  categories: CategoryOption[];
  onChange: (id: string) => void;
  onCreated: (category: CategoryOption) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await safeAction(() => createCategory({ name }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCreated(result.data);
      onChange(result.data.id);
      setName('');
      setError('');
      setAdding(false);
    });

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="product-category" className="font-medium">
          Danh mục
        </label>
        <Link
          href="/admin/shop/categories"
          target="_blank"
          className="text-muted-foreground text-xs hover:underline"
        >
          Quản lý danh mục ↗
        </Link>
      </div>
      <select
        id="product-category"
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        <option value="">— Chọn danh mục —</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {adding ? (
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={name}
            autoFocus
            maxLength={60}
            placeholder="Tên danh mục mới, ví dụ: Giày dép"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              } else if (event.key === 'Escape') {
                setAdding(false);
              }
            }}
          />
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? 'Đang thêm…' : 'Thêm'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
            Hủy
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          <Plus className="size-4" /> Thêm danh mục mới
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Danh mục, tình trạng máy (danh mục có tình trạng) và bảo hành / đổi trả — theo thứ tự nhập. */
export function ShopInfoFields({
  value,
  onChange,
  categories,
  onCategoryCreated,
}: Props & {
  categories: CategoryOption[];
  onCategoryCreated: (category: CategoryOption) => void;
}) {
  const hasCondition = Boolean(
    categories.find((category) => category.id === value.category)?.hasCondition,
  );
  return (
    <>
      <input type="hidden" name="categoryId" value={value.category} />
      <input type="hidden" name="condition" value={hasCondition ? value.condition : ''} />

      <CategoryPicker
        value={value.category}
        categories={categories}
        onChange={(category) => onChange({ category })}
        onCreated={onCategoryCreated}
      />
      {hasCondition && (
        <div className="bg-muted/30 space-y-3 rounded-lg p-3">
          <div className="space-y-2 text-sm">
            <p className="font-medium">Tình trạng máy</p>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange({ condition: option.value })}
                  aria-pressed={value.condition === option.value}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    value.condition === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-2 text-sm">
            Mô tả tình trạng
            <textarea
              name="conditionNote"
              className={`${inputClass} min-h-20`}
              maxLength={300}
              placeholder="Ví dụ: Trầy nhẹ cạnh, pin 88%, đủ hộp sạc"
              value={value.conditionNote}
              onChange={(event) => onChange({ conditionNote: event.target.value })}
            />
          </label>
        </div>
      )}

      <label className="block space-y-2 text-sm">
        Bảo hành / đổi trả <span className="text-muted-foreground">(tùy chọn)</span>
        <input
          name="warrantyNote"
          className={inputClass}
          maxLength={300}
          placeholder={
            value.type === 'ACCOUNT'
              ? 'Ví dụ: Bảo hành đủ thời hạn gói'
              : 'Ví dụ: Bảo hành 7 ngày, đổi trả trong 3 ngày nếu lỗi'
          }
          value={value.warrantyNote}
          onChange={(event) => onChange({ warrantyNote: event.target.value })}
        />
      </label>
    </>
  );
}
