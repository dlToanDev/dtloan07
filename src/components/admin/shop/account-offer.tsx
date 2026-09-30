'use client';

import { useEffect, useState } from 'react';
import { FormSection } from '@/components/admin/shop/form-section';
import { MoneyInput } from '@/components/admin/shop/money-input';
import { ChoiceCard, DELIVERY_OPTIONS } from '@/components/admin/shop/shop-details-section';
import { DEFAULT_VARIANT_NAME, serializeRows, type VariantDefault } from '@/lib/shop/product-form';

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2 text-sm';

/**
 * Tài khoản số bán một giá: thẻ "Giá bán" và thẻ "Thông tin tài khoản". Gửi tự động thì admin dán
 * danh sách tài khoản (mỗi dòng một tài khoản) — lưu sản phẩm là mã hóa và thêm vào kho luôn.
 */
export function AccountOffer({
  defaultVariant,
  deliveryMode,
  onDeliveryModeChange,
  keyConfigured,
  availableCount,
  onPricesChange,
}: {
  /** Biến thể đang có (sửa sản phẩm) — giữ id để không đứt đơn cũ và kho tài khoản. */
  defaultVariant?: VariantDefault;
  deliveryMode: 'AUTO' | 'MANUAL' | '';
  onDeliveryModeChange: (mode: 'AUTO' | 'MANUAL') => void;
  keyConfigured: boolean;
  /** Số tài khoản còn trống trong kho (sản phẩm đã lưu), null nếu chưa có. */
  availableCount: number | null;
  onPricesChange: (prices: string[]) => void;
}) {
  const [price, setPrice] = useState(defaultVariant ? String(defaultVariant.priceVnd) : '');
  const [compareAt, setCompareAt] = useState(
    defaultVariant?.compareAtVnd == null ? '' : String(defaultVariant.compareAtVnd),
  );
  const [stock, setStock] = useState(
    defaultVariant?.stock == null ? '' : String(defaultVariant.stock),
  );
  const [lines, setLines] = useState('');

  const isAuto = deliveryMode === 'AUTO';
  // Cùng quy tắc với splitCredentialLines phía server (file đó dùng node:crypto nên không import).
  const newCount = lines.split(/\r?\n/).filter((line) => line.trim()).length;
  const payload = serializeRows(
    [
      {
        key: 'account',
        id: defaultVariant?.id,
        name: defaultVariant?.name || DEFAULT_VARIANT_NAME,
        sku: defaultVariant?.sku ?? '',
        priceVnd: price,
        compareAtVnd: compareAt,
        stock,
        active: true,
      },
    ],
    isAuto,
  );

  useEffect(() => onPricesChange(price ? [price] : []), [price, onPricesChange]);

  return (
    <>
      <FormSection title="Giá bán">
        <input type="hidden" name="variants" value={JSON.stringify(payload)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            Giá bán
            <MoneyInput value={price} onChange={setPrice} label="Giá bán" required />
          </label>
          <label className="block space-y-1.5 text-sm">
            Giá gốc <span className="text-muted-foreground">(gạch ngang, tùy chọn)</span>
            <MoneyInput
              value={compareAt}
              onChange={setCompareAt}
              label="Giá gốc"
              placeholder="Không bắt buộc"
            />
          </label>
        </div>
      </FormSection>

      <FormSection
        id="kho-tai-khoan"
        title="Thông tin tài khoản"
        hint="Khách nhận thông tin này sau khi thanh toán. Hết tài khoản thì trang sản phẩm hiện nút “Liên hệ”."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {DELIVERY_OPTIONS.map((option) => (
            <ChoiceCard
              key={option.value}
              selected={deliveryMode === option.value}
              label={option.label}
              hint={option.hint}
              onClick={() => onDeliveryModeChange(option.value)}
            />
          ))}
        </div>

        {isAuto ? (
          <label className="block space-y-1.5 text-sm font-medium">
            Danh sách tài khoản — mỗi dòng một tài khoản
            <textarea
              name="accountLines"
              value={lines}
              onChange={(event) => setLines(event.target.value)}
              disabled={!keyConfigured}
              rows={6}
              spellCheck={false}
              placeholder={'email1@gmail.com|matkhau1\nemail2@gmail.com|matkhau2|ghi chú'}
              className={`${inputClass} bg-muted/30 font-mono leading-relaxed font-normal`}
            />
            <span className="text-muted-foreground flex flex-wrap justify-between gap-2 text-xs font-normal">
              <span>
                {keyConfigured
                  ? 'Được mã hóa khi lưu. Mỗi dòng gửi cho đúng một khách.'
                  : 'Chưa cấu hình ACCOUNT_ENCRYPTION_KEY nên chưa nhập được tài khoản.'}
              </span>
              <span className="text-foreground font-medium">
                {availableCount !== null && `Kho còn ${availableCount}`}
                {availableCount !== null && newCount > 0 && ' · '}
                {newCount > 0 && `+${newCount} tài khoản mới`}
              </span>
            </span>
          </label>
        ) : (
          <label className="block max-w-xs space-y-1.5 text-sm">
            Số lượng
            <input
              className={inputClass}
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={stock}
              placeholder="Không giới hạn"
              onChange={(event) => setStock(event.target.value)}
            />
            <span className="text-muted-foreground text-xs">
              Nhập 0 khi hết — trang sản phẩm sẽ hiện nút “Liên hệ”.
            </span>
          </label>
        )}
      </FormSection>
    </>
  );
}
