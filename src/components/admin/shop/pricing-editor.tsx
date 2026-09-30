'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MoneyInput } from '@/components/admin/shop/money-input';
import {
  duplicateLineKeys,
  linesToRows,
  newLine,
  serializeRows,
  toLine,
  type VariantDefault,
  type VariantLine,
} from '@/lib/shop/product-form';

const inputClass = 'border-border bg-background w-full min-w-0 rounded-lg border px-3 py-2 text-sm';

const COLUMNS = {
  PHYSICAL: [
    { label: 'Màu sắc', placeholder: 'Ví dụ: Đen' },
    { label: 'Size', placeholder: 'Ví dụ: M' },
  ],
  ACCOUNT: [{ label: 'Gói / loại', placeholder: 'Ví dụ: 1 tháng' }],
} as const;

/**
 * Phân loại, giá & số lượng: mỗi dòng là một phân loại của sản phẩm (màu + size, hoặc gói).
 * Nhập xong một dòng bấm "Thêm" để nhập tiếp màu / size khác. Chỉ một dòng để trống thuộc tính
 * nghĩa là sản phẩm bán một giá.
 */
export function PricingEditor({
  defaultValue,
  goodsType,
  stockFromAccounts,
  onPricesChange,
}: {
  defaultValue: VariantDefault[];
  goodsType: 'PHYSICAL' | 'ACCOUNT';
  /** Tài khoản bàn giao tự động: số lượng = số tài khoản còn trống trong kho. */
  stockFromAccounts: boolean;
  /** Báo giá các phân loại đang bán lên form để nhắc "còn thiếu giá bán". */
  onPricesChange?: (prices: string[]) => void;
}) {
  const columns = COLUMNS[goodsType];
  const [lines, setLines] = useState<VariantLine[]>(() =>
    defaultValue.length
      ? defaultValue.map((variant) => toLine(variant, columns.length as 1 | 2))
      : [newLine()],
  );
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const update = (key: string, patch: Partial<VariantLine>) =>
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const setAttr = (line: VariantLine, index: number, value: string) =>
    update(line.key, {
      attrs: index === 0 ? [value, line.attrs[1]] : [line.attrs[0], value],
    });

  const addLine = () => {
    const line = newLine(lines[lines.length - 1]);
    setLines((prev) => [...prev, line]);
    setFocusKey(line.key);
  };

  const totalStock = lines
    .filter((line) => line.active)
    .reduce((sum, line) => sum + (Number(line.stock) || 0), 0);
  const hasUnlimited = lines.some((line) => line.active && line.stock === '');

  // Chỉ một cột thuộc tính (gói) thì bỏ giá trị cột thứ hai còn sót, để không lọt vào tên.
  const visibleLines =
    columns.length === 1
      ? lines.map((line) => ({ ...line, attrs: [line.attrs[0], ''] as [string, string] }))
      : lines;
  const duplicates = duplicateLineKeys(visibleLines);
  const payload = serializeRows(linesToRows(visibleLines), stockFromAccounts);
  const activePrices = payload
    .filter((variant) => variant.active)
    .map((variant) => String(variant.priceVnd))
    .join(',');

  useEffect(() => {
    onPricesChange?.(activePrices ? activePrices.split(',') : []);
  }, [activePrices, onPricesChange]);

  const grid =
    columns.length === 2
      ? 'sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_2.25rem]'
      : 'sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_2.25rem]';

  return (
    <div className="space-y-3">
      <input type="hidden" name="variants" value={JSON.stringify(payload)} />

      <div className="border-border overflow-hidden rounded-lg border">
        <div
          className={`bg-muted/50 text-muted-foreground hidden gap-2 px-3 py-2 text-xs font-medium sm:grid ${grid}`}
        >
          {columns.map((column) => (
            <span key={column.label}>{column.label}</span>
          ))}
          <span>Giá bán</span>
          <span>Số lượng</span>
          <span />
        </div>

        {lines.map((line) => {
          const duplicated = duplicates.has(line.key);
          const needsAttr = lines.length > 1 && !line.attrs[0].trim() && !line.attrs[1].trim();
          return (
            <div
              key={line.key}
              className={`border-border grid grid-cols-2 items-center gap-2 border-t px-3 py-2.5 first-of-type:border-t-0 sm:first-of-type:border-t ${grid} ${
                line.active ? '' : 'opacity-50'
              }`}
            >
              {columns.map((column, index) => (
                <input
                  key={column.label}
                  className={`${inputClass} ${columns.length === 1 ? 'col-span-2 sm:col-span-1' : ''} ${
                    duplicated ? 'border-red-500' : ''
                  }`}
                  value={line.attrs[index]}
                  maxLength={48}
                  placeholder={column.placeholder}
                  aria-label={column.label}
                  required={needsAttr && index === 0}
                  title={needsAttr ? `Nhập ${column.label.toLowerCase()} cho dòng này` : undefined}
                  autoFocus={
                    line.key === focusKey &&
                    index === (columns.length === 2 && line.attrs[0] ? 1 : 0)
                  }
                  onChange={(event) => setAttr(line, index, event.target.value)}
                />
              ))}
              <MoneyInput
                value={line.priceVnd}
                required
                placeholder="Giá"
                label="Giá bán"
                onChange={(value) => update(line.key, { priceVnd: value })}
              />
              <input
                className={`${inputClass} disabled:bg-muted/40`}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder={stockFromAccounts ? 'Theo kho' : 'Không giới hạn'}
                aria-label="Số lượng"
                disabled={stockFromAccounts}
                value={stockFromAccounts ? '' : line.stock}
                onChange={(event) => update(line.key, { stock: event.target.value })}
              />
              <div className="col-span-2 flex justify-end sm:col-span-1">
                {line.active ? (
                  <button
                    type="button"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((item) => item.key !== line.key))}
                    className="text-muted-foreground hover:text-destructive hover:bg-muted rounded-md p-2 disabled:invisible"
                    title="Xóa dòng này"
                  >
                    <X className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => update(line.key, { active: true })}
                    className="text-primary text-xs hover:underline"
                    title="Phân loại này đang tạm ngừng bán"
                  >
                    Mở bán
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addLine}
          className="border-border text-primary hover:bg-muted/40 flex w-full items-center justify-center gap-2 border-t border-dashed px-3 py-3 text-sm font-medium"
        >
          <Plus className="size-4" />
          {goodsType === 'PHYSICAL' ? 'Thêm màu / size khác' : 'Thêm gói khác'}
        </button>
      </div>

      {duplicates.size > 0 && (
        <p role="alert" className="text-sm text-red-600">
          Có dòng bị trùng {goodsType === 'PHYSICAL' ? 'màu + size' : 'tên gói'}, hãy sửa lại cho
          khác nhau.
        </p>
      )}

      {stockFromAccounts ? (
        <p className="rounded-lg bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-300">
          Số lượng được tính tự động theo số tài khoản còn trống trong <b>Kho tài khoản</b> (cuối
          trang).
        </p>
      ) : (
        <p className="text-muted-foreground flex flex-wrap justify-between gap-2 text-xs">
          <span>
            {goodsType === 'PHYSICAL'
              ? 'Chỉ có một loại thì để trống màu và size. '
              : 'Chỉ có một gói thì để trống tên gói. '}
            Gõ giá tắt: 150k, 1.5tr. Để trống số lượng = không giới hạn.
          </span>
          {lines.length > 1 && (
            <span className="text-foreground font-medium">
              Tổng: {hasUnlimited ? 'không giới hạn' : `${totalStock} sản phẩm`}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
