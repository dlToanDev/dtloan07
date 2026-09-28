'use client';

import { useEffect, useRef, useState } from 'react';
import { formatMoney, parseMoney } from '@/lib/shop/product-form';

/**
 * Ô nhập giá VND: hiện "150.000 đ", cho gõ tắt "150k", "1.5tr". `value` luôn là chuỗi số nguyên
 * (hoặc ""). Có `name` thì gửi kèm form qua một input ẩn.
 */
export function MoneyInput({
  value,
  onChange,
  name,
  required,
  placeholder = 'Ví dụ: 150k',
  label,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Gõ chữ mà không đọc ra được số (vd. "1tỷ") → báo lỗi thay vì âm thầm lưu giá 0.
  const invalid = Boolean(draft?.trim()) && parseMoney(draft!) === '';

  useEffect(() => {
    inputRef.current?.setCustomValidity(
      invalid ? 'Giá không hợp lệ. Ví dụ: 150000, 150.000, 150k, 1.5tr' : '',
    );
  }, [invalid]);

  return (
    <div className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value || '0'} />}
      <input
        ref={inputRef}
        className={`bg-background w-full min-w-0 rounded-lg border py-2 pr-7 pl-3 text-sm ${
          invalid ? 'border-red-500' : 'border-border'
        }`}
        aria-invalid={invalid || undefined}
        title={invalid ? 'Giá không hợp lệ. Ví dụ: 150k, 1.5tr' : undefined}
        inputMode="decimal"
        autoComplete="off"
        value={draft ?? formatMoney(value)}
        required={required}
        placeholder={placeholder}
        aria-label={label}
        onFocus={() => setDraft(formatMoney(value))}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(parseMoney(event.target.value));
        }}
        onBlur={() => {
          if (!invalid) setDraft(null);
        }}
      />
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
        đ
      </span>
    </div>
  );
}
