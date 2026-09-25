'use client';

import { useState } from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateVariantCombos } from '@/lib/shop/variants';

export interface VariantRow {
  key: string;
  id?: string;
  name: string;
  sku: string;
  priceVnd: string;
  compareAtVnd: string;
  stock: string;
  active: boolean;
}

export interface VariantTableDefault {
  id?: string;
  name: string;
  sku: string | null;
  priceVnd: number;
  compareAtVnd: number | null;
  stock: number | null;
  active: boolean;
}

let rowSeq = 0;
const newKey = () => `row-${++rowSeq}`;

function toRow(variant: VariantTableDefault): VariantRow {
  return {
    key: variant.id ?? newKey(),
    id: variant.id,
    name: variant.name,
    sku: variant.sku ?? '',
    priceVnd: String(variant.priceVnd),
    compareAtVnd: variant.compareAtVnd === null ? '' : String(variant.compareAtVnd),
    stock: variant.stock === null ? '' : String(variant.stock),
    active: variant.active,
  };
}

const emptyRow = (name = ''): VariantRow => ({
  key: newKey(),
  name,
  sku: '',
  priceVnd: '',
  compareAtVnd: '',
  stock: '',
  active: true,
});

const cellClass =
  'border-border bg-background w-full min-w-0 rounded-md border px-2 py-1.5 text-sm';

export function VariantTable({
  defaultValue,
  stockReadOnly = false,
}: {
  defaultValue: VariantTableDefault[];
  stockReadOnly?: boolean;
}) {
  const [rows, setRows] = useState<VariantRow[]>(
    defaultValue.length ? defaultValue.map(toRow) : [emptyRow('Mặc định')],
  );
  const [groupA, setGroupA] = useState('');
  const [groupB, setGroupB] = useState('');

  const update = (key: string, patch: Partial<VariantRow>) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const quickGenerate = () => {
    const names = generateVariantCombos([groupA, groupB]);
    setRows((prev) => {
      const existing = new Set(prev.map((row) => row.name.trim().toLowerCase()));
      const basePrice = prev.find((row) => row.priceVnd)?.priceVnd ?? '';
      const onlyPlaceholder = prev.length === 1 && prev[0]?.name === 'Mặc định' && !prev[0].id;
      const additions = names
        .filter((name) => !existing.has(name.toLowerCase()))
        .map((name) => ({ ...emptyRow(name), priceVnd: basePrice }));
      return onlyPlaceholder && additions.length ? additions : [...prev, ...additions];
    });
  };

  const serialized = rows.map((row) => ({
    ...(row.id && { id: row.id }),
    name: row.name,
    sku: row.sku,
    priceVnd: row.priceVnd === '' ? 0 : Number(row.priceVnd),
    compareAtVnd: row.compareAtVnd,
    stock: stockReadOnly ? '' : row.stock,
    active: row.active,
  }));

  return (
    <div className="space-y-4">
      <input type="hidden" name="variants" value={JSON.stringify(serialized)} />

      <div className="bg-muted/30 border-border grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className={cellClass}
          placeholder="Nhóm 1, ví dụ: Đen, Trắng"
          value={groupA}
          onChange={(event) => setGroupA(event.target.value)}
        />
        <input
          className={cellClass}
          placeholder="Nhóm 2, ví dụ: S, M, L"
          value={groupB}
          onChange={(event) => setGroupB(event.target.value)}
        />
        <Button type="button" variant="outline" size="sm" onClick={quickGenerate}>
          <Wand2 className="size-4" /> Tạo nhanh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-muted-foreground text-left text-xs">
            <tr>
              <th className="pb-2">Tên biến thể</th>
              <th className="pb-2">Giá (đ)</th>
              <th className="pb-2">Giá gạch</th>
              <th className="pb-2">Tồn kho</th>
              <th className="pb-2">SKU</th>
              <th className="pb-2 text-center">Bán</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map((row) => (
              <tr key={row.key} className={row.active ? '' : 'opacity-50'}>
                <td className="py-1.5 pr-2">
                  <input
                    className={cellClass}
                    value={row.name}
                    required
                    maxLength={100}
                    onChange={(event) => update(row.key, { name: event.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    className={cellClass}
                    type="number"
                    min="0"
                    step="1000"
                    value={row.priceVnd}
                    required
                    onChange={(event) => update(row.key, { priceVnd: event.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    className={cellClass}
                    type="number"
                    min="0"
                    step="1000"
                    value={row.compareAtVnd}
                    onChange={(event) => update(row.key, { compareAtVnd: event.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    className={cellClass}
                    type="number"
                    min="0"
                    step="1"
                    placeholder={stockReadOnly ? 'Theo kho' : '∞'}
                    disabled={stockReadOnly}
                    value={stockReadOnly ? '' : row.stock}
                    onChange={(event) => update(row.key, { stock: event.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    className={cellClass}
                    value={row.sku}
                    maxLength={64}
                    onChange={(event) => update(row.key, { sku: event.target.value })}
                  />
                </td>
                <td className="py-1.5 text-center">
                  <input
                    type="checkbox"
                    className="accent-primary size-4"
                    checked={row.active}
                    onChange={(event) => update(row.key, { active: event.target.checked })}
                  />
                </td>
                <td className="py-1.5 text-right">
                  <button
                    type="button"
                    disabled={rows.length === 1}
                    onClick={() => setRows((prev) => prev.filter((item) => item.key !== row.key))}
                    className="text-muted-foreground hover:text-destructive p-1 disabled:opacity-30"
                    title="Xóa biến thể"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setRows((prev) => [...prev, emptyRow()])}
      >
        <Plus className="size-4" /> Thêm biến thể
      </Button>
      <p className="text-muted-foreground text-xs">
        Để trống tồn kho = không giới hạn. Biến thể đã có đơn hàng khi xóa sẽ chỉ bị ẩn, không mất
        lịch sử đơn.
      </p>
    </div>
  );
}
