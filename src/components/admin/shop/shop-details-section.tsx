'use client';

import {
  CONDITION_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  SHOP_CATEGORY_OPTIONS,
  type ItemConditionValue,
  type ProductTypeOption,
  type ShopCategoryValue,
} from '@/lib/shop/labels';

export interface ShopDetailsValue {
  type: ProductTypeOption;
  category: ShopCategoryValue | '';
  condition: ItemConditionValue | '';
  conditionNote: string;
  warrantyNote: string;
  deliveryMode: 'AUTO' | 'MANUAL' | '';
}

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2.5 text-sm';

export function ShopDetailsSection({
  value,
  onChange,
  typeLocked,
}: {
  value: ShopDetailsValue;
  onChange: (patch: Partial<ShopDetailsValue>) => void;
  typeLocked: boolean;
}) {
  return (
    <div className="space-y-4">
      <input type="hidden" name="type" value={value.type} />
      <input type="hidden" name="category" value={value.category} />
      <input
        type="hidden"
        name="condition"
        value={value.category === 'TECH' ? value.condition : ''}
      />
      <input
        type="hidden"
        name="deliveryMode"
        value={value.type === 'ACCOUNT' ? value.deliveryMode : ''}
      />

      <div className="space-y-2 text-sm">
        <p className="font-medium">Loại hàng</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {PRODUCT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={typeLocked && option.value !== value.type}
              onClick={() =>
                onChange({
                  type: option.value,
                  ...(option.value === 'ACCOUNT' && { category: 'ACCOUNT' as const }),
                  ...(option.value !== 'ACCOUNT' &&
                    value.category === 'ACCOUNT' && { category: '' as const }),
                })
              }
              className={`rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                value.type === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/40'
              }`}
            >
              <span className="block font-semibold">{option.label}</span>
              <span className="text-muted-foreground text-xs">{option.hint}</span>
            </button>
          ))}
        </div>
        {typeLocked && (
          <p className="text-muted-foreground text-xs">
            Sản phẩm đã có đơn hàng nên không đổi loại hàng được.
          </p>
        )}
      </div>

      <label className="block space-y-2 text-sm">
        Danh mục
        <select
          className={inputClass}
          value={value.category}
          onChange={(event) => onChange({ category: event.target.value as ShopCategoryValue })}
          required
        >
          <option value="">— Chọn danh mục —</option>
          {SHOP_CATEGORY_OPTIONS.filter((option) =>
            value.type === 'ACCOUNT' ? option.value === 'ACCOUNT' : option.value !== 'ACCOUNT',
          ).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {value.category === 'TECH' && (
        <>
          <div className="space-y-2 text-sm">
            <p>Tình trạng</p>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange({ condition: option.value })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    value.condition === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border'
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
        </>
      )}

      {value.type === 'ACCOUNT' && (
        <label className="block space-y-2 text-sm">
          Cách bàn giao
          <select
            className={inputClass}
            value={value.deliveryMode}
            onChange={(event) =>
              onChange({ deliveryMode: event.target.value as 'AUTO' | 'MANUAL' })
            }
            required
          >
            <option value="">— Chọn cách bàn giao —</option>
            <option value="AUTO">Tự động từ kho tài khoản</option>
            <option value="MANUAL">Thủ công (bạn gửi sau khi khách trả tiền)</option>
          </select>
        </label>
      )}

      <label className="block space-y-2 text-sm">
        Bảo hành
        <input
          name="warrantyNote"
          className={inputClass}
          maxLength={300}
          placeholder={
            value.type === 'ACCOUNT' ? 'Ví dụ: Bảo hành đủ thời hạn gói' : 'Ví dụ: Bảo hành 7 ngày'
          }
          value={value.warrantyNote}
          onChange={(event) => onChange({ warrantyNote: event.target.value })}
        />
      </label>
    </div>
  );
}
