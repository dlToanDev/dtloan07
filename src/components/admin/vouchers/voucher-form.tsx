'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/admin/shop/form-section';
import { MoneyInput } from '@/components/admin/shop/money-input';
import { safeAction } from '@/lib/courses/safe-action';
import { describeVoucher, VOUCHER_TYPE_OPTIONS, type VoucherTypeValue } from '@/lib/coupon-labels';
import { saveVoucher } from '@/server/actions/voucher';

export interface VoucherFormValue {
  id?: string;
  name: string;
  code: string;
  type: VoucherTypeValue;
  value: number;
  maxDiscountVnd: number | null;
  minOrderVnd: number;
  scope: 'ALL' | 'CATEGORIES';
  categoryIds: string[];
  maxUses: number | null;
  perUserLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  proOnly: boolean;
}

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2.5 text-sm';

/** ISO → giá trị cho <input type="datetime-local"> theo giờ máy người dùng. */
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

export function VoucherForm({
  initial,
  categories,
}: {
  initial?: VoucherFormValue;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [type, setType] = useState<VoucherTypeValue>(initial?.type ?? 'FIXED');
  const [value, setValue] = useState(initial ? String(initial.value) : '');
  const [maxDiscount, setMaxDiscount] = useState(
    initial?.maxDiscountVnd ? String(initial.maxDiscountVnd) : '',
  );
  const [minOrder, setMinOrder] = useState(initial?.minOrderVnd ? String(initial.minOrderVnd) : '');
  const [scope, setScope] = useState(initial?.scope ?? 'ALL');
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  const [maxUses, setMaxUses] = useState(initial?.maxUses != null ? String(initial.maxUses) : '');
  const [perUserLimit, setPerUserLimit] = useState(
    initial ? (initial.perUserLimit != null ? String(initial.perUserLimit) : '') : '1',
  );
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt ?? null));
  const [active, setActive] = useState(initial?.active ?? true);
  const [proOnly, setProOnly] = useState(initial?.proOnly ?? false);

  const toggleCategory = (id: string) =>
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const submit = () => {
    setError('');
    setSaved(false);
    startTransition(async () => {
      const result = await safeAction(() =>
        saveVoucher({
          id: initial?.id,
          name,
          code,
          type,
          value: Number(value || 0),
          maxDiscountVnd: type === 'PERCENT' ? numberOrNull(maxDiscount) : null,
          minOrderVnd: numberOrNull(minOrder),
          scope,
          categoryIds,
          maxUses: numberOrNull(maxUses),
          perUserLimit: numberOrNull(perUserLimit),
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          active,
          proOnly,
        }),
      );
      if (!result.ok) return setError(result.error);
      setSaved(true);
      if (!initial?.id) router.push(`/admin/vouchers/${result.data.id}`);
      else router.refresh();
    });
  };

  const preview = describeVoucher({
    type,
    value: Number(value || 0),
    maxDiscountVnd: type === 'PERCENT' ? numberOrNull(maxDiscount) : null,
    minOrderVnd: Number(minOrder || 0),
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
          Đã lưu voucher.
        </p>
      )}

      <FormSection title="Thông tin voucher">
        <label className="block space-y-2 text-sm font-medium">
          Tên voucher (chỉ admin thấy)
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ví dụ: Sale 10/10 quần áo"
            required
            maxLength={100}
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Mã công khai
          <input
            className={`${inputClass} font-mono uppercase`}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Ví dụ: BLOG10"
            maxLength={30}
          />
          <span className="text-muted-foreground block text-xs font-normal">
            Mã ai cũng nhập được, dùng để ghi trong bài viết. Để trống nếu chỉ phát mã riêng cho
            từng người.
          </span>
        </label>
      </FormSection>

      <FormSection title="Mức giảm" hint={preview}>
        <div className="grid gap-2 sm:grid-cols-3">
          {VOUCHER_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              aria-pressed={type === option.value}
              className={`rounded-lg border p-3 text-left text-sm transition ${
                type === option.value
                  ? 'border-primary bg-primary/5 ring-primary ring-1'
                  : 'border-border hover:bg-muted/40'
              }`}
            >
              <span className="block font-semibold">{option.label}</span>
              <span className="text-muted-foreground text-xs">{option.hint}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {type === 'PERCENT' ? (
            <>
              <label className="block space-y-2 text-sm font-medium">
                Phần trăm giảm
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={inputClass}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="10"
                  required
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                Giảm tối đa (tùy chọn)
                <MoneyInput value={maxDiscount} onChange={setMaxDiscount} label="Giảm tối đa" />
              </label>
            </>
          ) : (
            <label className="block space-y-2 text-sm font-medium">
              {type === 'FIXED' ? 'Số tiền giảm' : 'Miễn ship tối đa (trống = miễn toàn bộ)'}
              <MoneyInput
                value={value}
                onChange={setValue}
                label={type === 'FIXED' ? 'Số tiền giảm' : 'Miễn ship tối đa'}
                required={type === 'FIXED'}
              />
            </label>
          )}
          <label className="block space-y-2 text-sm font-medium">
            Đơn tối thiểu (tùy chọn)
            <MoneyInput value={minOrder} onChange={setMinOrder} label="Đơn tối thiểu" />
          </label>
        </div>
      </FormSection>

      <FormSection
        title="Áp dụng cho"
        hint="Voucher theo danh mục chỉ giảm trên phần hàng thuộc danh mục đó trong giỏ."
      >
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={scope === 'ALL'} onChange={() => setScope('ALL')} />
            Tất cả sản phẩm Shop
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={scope === 'CATEGORIES'}
              onChange={() => setScope('CATEGORIES')}
            />
            Chỉ một số danh mục
          </label>
        </div>
        {scope === 'CATEGORIES' && (
          <div className="grid gap-2 sm:grid-cols-3">
            {categories.map((category) => (
              <label
                key={category.id}
                className="border-border hover:bg-muted/40 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={categoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                {category.name}
              </label>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection title="Giới hạn">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-medium">
            Tổng số lượt (trống = không giới hạn)
            <input
              type="number"
              min={0}
              className={inputClass}
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
              placeholder="Ví dụ: 100"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Mỗi người dùng mã công khai tối đa
            <input
              type="number"
              min={0}
              className={inputClass}
              value={perUserLimit}
              onChange={(event) => setPerUserLimit(event.target.value)}
              placeholder="Trống = không giới hạn"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Bắt đầu (tùy chọn)
            <input
              type="datetime-local"
              className={inputClass}
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Kết thúc (tùy chọn)
            <input
              type="datetime-local"
              className={inputClass}
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Đang bật (tắt để tạm dừng mà không xóa)
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={proOnly}
            onChange={(event) => setProOnly(event.target.checked)}
          />
          <span>
            <span className="font-medium">Chỉ dành cho tài khoản Pro</span>
            <span className="text-muted-foreground block text-xs">
              Voucher bí mật: tài khoản thường nhập mã sẽ bị từ chối.
            </span>
          </span>
        </label>
      </FormSection>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : initial?.id ? 'Lưu thay đổi' : 'Tạo voucher'}
        </Button>
      </div>
    </form>
  );
}
