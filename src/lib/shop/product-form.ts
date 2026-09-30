// Logic thuần cho form admin thêm/sửa sản phẩm — tách khỏi component để test được.

export const DEFAULT_VARIANT_NAME = 'Mặc định';

export interface PricingRow {
  key: string;
  id?: string;
  name: string;
  sku: string;
  priceVnd: string;
  compareAtVnd: string;
  stock: string;
  active: boolean;
}

export interface VariantDefault {
  id?: string;
  name: string;
  sku: string | null;
  priceVnd: number;
  compareAtVnd: number | null;
  stock: number | null;
  active: boolean;
}

let rowSeq = 0;
export const newRowKey = () => `row-${++rowSeq}`;

export function toRow(variant: VariantDefault): PricingRow {
  return {
    key: variant.id ?? newRowKey(),
    id: variant.id,
    name: variant.name,
    sku: variant.sku ?? '',
    priceVnd: String(variant.priceVnd),
    compareAtVnd: variant.compareAtVnd === null ? '' : String(variant.compareAtVnd),
    stock: variant.stock === null ? '' : String(variant.stock),
    active: variant.active,
  };
}

export const VARIANT_NAME_SEPARATOR = ' / ';

/** Một dòng phân loại admin nhập: thuộc tính (màu, size… hoặc gói) + giá + số lượng. */
export interface VariantLine {
  key: string;
  id?: string;
  /** Hàng vật lý: [màu, size]. Tài khoản số: [gói, ""]. */
  attrs: [string, string];
  priceVnd: string;
  compareAtVnd: string;
  stock: string;
  sku: string;
  active: boolean;
}

/** Tên biến thể lưu DB ghép từ thuộc tính: "Đen / M". Không có thuộc tính → "Mặc định". */
export function variantLineName(attrs: [string, string]): string {
  return (
    attrs
      .map((attr) => attr.trim())
      .filter(Boolean)
      .join(VARIANT_NAME_SEPARATOR) || DEFAULT_VARIANT_NAME
  );
}

/** Đọc ngược biến thể DB thành dòng. `columns = 1` giữ nguyên tên trong một ô (tài khoản số). */
export function toLine(variant: VariantDefault, columns: 1 | 2): VariantLine {
  const name = variant.name === DEFAULT_VARIANT_NAME ? '' : variant.name;
  const [first = '', ...rest] = columns === 2 ? name.split(VARIANT_NAME_SEPARATOR) : [name];
  const row = toRow(variant);
  return {
    key: row.key,
    id: row.id,
    attrs: [first.trim(), rest.join(VARIANT_NAME_SEPARATOR).trim()],
    priceVnd: row.priceVnd,
    compareAtVnd: row.compareAtVnd,
    stock: row.stock,
    sku: row.sku,
    active: row.active,
  };
}

/** Dòng mới; có dòng trước thì lấy sẵn thuộc tính đầu (màu) và giá để nhập nhanh size kế tiếp. */
export function newLine(previous?: VariantLine): VariantLine {
  return {
    key: newRowKey(),
    attrs: [previous?.attrs[0] ?? '', ''],
    priceVnd: previous?.priceVnd ?? '',
    compareAtVnd: '',
    stock: '',
    sku: '',
    active: true,
  };
}

export function linesToRows(lines: VariantLine[]): PricingRow[] {
  return lines.map(({ attrs, ...line }) => ({ ...line, name: variantLineName(attrs) }));
}

/** Key các dòng bị trùng tên (cùng màu + size), để tô đỏ trước khi server từ chối. */
export function duplicateLineKeys(lines: VariantLine[]): Set<string> {
  const byName = new Map<string, string[]>();
  for (const line of lines) {
    const name = variantLineName(line.attrs).toLowerCase();
    byName.set(name, [...(byName.get(name) ?? []), line.key]);
  }
  return new Set([...byName.values()].filter((keys) => keys.length > 1).flat());
}

/**
 * Đọc giá admin gõ: "150000", "150.000", "150k", "1.5tr", "1,5 triệu" → chuỗi số nguyên VND.
 * Không hiểu được thì trả về "".
 */
export function parseMoney(text: string): string {
  const match = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/đ$|vnd$/, '')
    .match(/^(\d[\d.,]*)(k|nghìn|ngàn|tr|triệu|m)?$/);
  if (!match) return '';
  const [, digits = '', unit] = match;
  // "150.000" / "1,500,000": dấu chấm/phẩy theo sau đúng 3 chữ số là ngăn cách hàng nghìn.
  const grouped = /^\d{1,3}([.,]\d{3})+$/.test(digits);
  let value: number;
  if (grouped || /^\d+$/.test(digits)) {
    value = Number(digits.replace(/[.,]/g, ''));
  } else if (unit && /^\d+[.,]\d+$/.test(digits)) {
    value = Number(digits.replace(',', '.')); // "1.5tr", "2,5k"
  } else {
    return ''; // "1.5" không có đơn vị, "1.2.3"… → không đoán
  }
  if (unit) value *= unit === 'k' || unit === 'nghìn' || unit === 'ngàn' ? 1_000 : 1_000_000;
  return String(Math.round(value));
}

/** 150000 → "150.000". */
export function formatMoney(value: string): string {
  return value === '' ? '' : Number(value).toLocaleString('vi-VN');
}

/** Định dạng field ẩn `variants` mà `parseVariantsInput` phía server đọc. */
export function serializeRows(rows: PricingRow[], stockFromAccounts: boolean) {
  return rows.map((row) => ({
    ...(row.id && { id: row.id }),
    name: row.name,
    sku: row.sku,
    priceVnd: row.priceVnd === '' ? 0 : Number(row.priceVnd),
    // Giá gạch ngang cũ không còn lớn hơn giá mới (vd. vừa tăng giá) thì bỏ, tránh server từ chối.
    compareAtVnd:
      row.compareAtVnd !== '' && Number(row.compareAtVnd) > Number(row.priceVnd || 0)
        ? row.compareAtVnd
        : '',
    stock: stockFromAccounts ? '' : row.stock,
    active: row.active,
  }));
}

export interface PublishCheckInput {
  type: 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT' | '';
  name: string;
  shortDesc: string;
  category: string;
  deliveryMode: string;
  saleMode: 'FREE' | 'CONTACT' | 'PAID';
  /** Giá của hàng source code (tải file). */
  downloadPrice: string;
  /** Giá các biến thể đang bán (đồ vật lý / tài khoản số). */
  variantPrices: string[];
}

/** Các mục còn thiếu để đăng bán, theo đúng thứ tự các bước trên form. */
export function missingForPublish(input: PublishCheckInput): string[] {
  const missing: string[] = [];
  if (!input.type) missing.push('loại hàng');
  if (input.type && !input.category) missing.push('danh mục');
  if (!input.name.trim()) missing.push('tên sản phẩm');
  if (!input.shortDesc.trim()) missing.push('tóm tắt');

  const isGoods = input.type === 'PHYSICAL' || input.type === 'ACCOUNT';
  const hasPrice = isGoods
    ? input.variantPrices.some((price) => Number(price) > 0)
    : input.saleMode !== 'PAID' || Number(input.downloadPrice) > 0;
  if (input.type && !hasPrice) missing.push('giá bán');
  if (input.type === 'ACCOUNT' && !input.deliveryMode) missing.push('cách bàn giao');
  return missing;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}
