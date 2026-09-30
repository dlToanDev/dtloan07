import { lineKey, type ProductTypeValue } from '@/lib/shop/variants';

export interface ShippingZoneSnapshot {
  id: string;
  name: string;
  provinces: string[];
  feeVnd: number;
  freeShipFromVnd: number | null;
  isDefault: boolean;
  sortOrder: number;
}

export interface ShippingQuote {
  feeVnd: number;
  zoneName: string | null;
  freeShip: boolean;
}

/** Số điện thoại Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx. */
export const VN_PHONE_RE = /^(0|\+84)\d{9}$/;

/**
 * Phí ship theo khu vực.
 * - Tỉnh thuộc nhiều khu: lấy khu có `sortOrder` nhỏ nhất (hòa thì `id` nhỏ hơn).
 * - Không khu nào chứa tỉnh: rơi về khu `isDefault`.
 * - Không có khu nào dùng được: phí 0 (admin chưa cấu hình).
 */
export function quoteShipping({
  zones,
  provinceCode,
  physicalSubtotalVnd,
}: {
  zones: ShippingZoneSnapshot[];
  provinceCode: string | null | undefined;
  physicalSubtotalVnd: number;
}): ShippingQuote {
  if (!provinceCode) return { feeVnd: 0, zoneName: null, freeShip: false };

  const byOrder = (a: ShippingZoneSnapshot, b: ShippingZoneSnapshot) =>
    a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  const matched = zones.filter((zone) => zone.provinces.includes(provinceCode)).sort(byOrder)[0];
  const zone = matched ?? zones.filter((candidate) => candidate.isDefault).sort(byOrder)[0];
  if (!zone) return { feeVnd: 0, zoneName: null, freeShip: false };

  const freeShip =
    zone.freeShipFromVnd !== null && physicalSubtotalVnd >= Math.max(0, zone.freeShipFromVnd);

  return {
    feeVnd: freeShip ? 0 : Math.max(0, zone.feeVnd),
    zoneName: zone.name,
    freeShip,
  };
}

export interface CartLineType {
  productId: string;
  variantId: string;
  qty: number;
  type: ProductTypeValue;
}

export interface CartTotals {
  physicalSubtotalVnd: number;
  physicalAfterDiscountVnd: number;
  hasPhysical: boolean;
  allPhysical: boolean;
}

/**
 * Tách tạm tính của hàng vật lý khỏi hàng số.
 * Giỏ trộn: giảm giá được phân bổ theo tỉ lệ để so với ngưỡng freeship,
 * vì coupon áp cho cả đơn còn freeship chỉ xét phần hàng phải giao.
 */
export function splitCartTotals({
  lines,
  pricingItems,
  discountVnd,
}: {
  lines: CartLineType[];
  pricingItems: { productId: string; variantId?: string; itemTotalVnd: number }[];
  discountVnd: number;
}): CartTotals {
  const typeByLine = new Map(lines.map((line) => [lineKey(line.productId, line.variantId), line]));

  let subtotalVnd = 0;
  let physicalSubtotalVnd = 0;
  for (const item of pricingItems) {
    subtotalVnd += item.itemTotalVnd;
    const line = typeByLine.get(lineKey(item.productId, item.variantId));
    if (line?.type === 'PHYSICAL') physicalSubtotalVnd += item.itemTotalVnd;
  }

  const physicalDiscount =
    subtotalVnd > 0 ? Math.round((discountVnd * physicalSubtotalVnd) / subtotalVnd) : 0;

  return {
    physicalSubtotalVnd,
    physicalAfterDiscountVnd: Math.max(0, physicalSubtotalVnd - physicalDiscount),
    hasPhysical: physicalSubtotalVnd > 0 || lines.some((line) => line.type === 'PHYSICAL'),
    allPhysical: lines.length > 0 && lines.every((line) => line.type === 'PHYSICAL'),
  };
}

/** COD chỉ dùng được khi mọi món trong giỏ đều là hàng vật lý. */
export function canUseCOD(lines: CartLineType[]): boolean {
  return lines.length > 0 && lines.every((line) => line.type === 'PHYSICAL');
}
