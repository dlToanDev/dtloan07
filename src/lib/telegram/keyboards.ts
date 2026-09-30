import { InlineKeyboard, Keyboard } from 'grammy';
import { siteConfig } from '@/config/site';

/**
 * Bàn phím điều hướng cố định dưới thanh chat Telegram (Persistent Menu)
 */
export function persistentReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text('📂 Sản phẩm')
    .text('💰 Ví tiền')
    .row()
    .text('🔍 Tìm kiếm')
    .text('💬 Hỗ trợ')
    .row()
    .text('🏠 Menu chính')
    .resized()
    .persistent();
}

/**
 * Format tiền tệ VND gọn gàng
 */
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đ`;
}

export function isValidTelegramUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    /^https?:\/\//i.test(url) &&
    !url.includes('localhost') &&
    !url.includes('127.0.0.1') &&
    !url.includes('0.0.0.0')
  );
}

/**
 * Menu chính khi gõ /start hoặc bấm Menu
 */
export function mainMenuKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .text('📁 File Code & Dự án mẫu', 'cat:DOWNLOAD')
    .row()
    .text('🔐 Tài khoản Bản quyền', 'cat:ACCOUNT')
    .row()
    .text('🔍 Đơn hàng của tôi', 'nav:orders')
    .text('💬 Hỗ trợ kỹ thuật', 'nav:support');

  if (isValidTelegramUrl(siteConfig.url)) {
    keyboard.row().url('🌐 Ghé thăm Website', siteConfig.url);
  }

  return keyboard;
}

/**
 * Menu chọn danh mục sản phẩm (chỉ hỗ trợ DOWNLOAD và ACCOUNT)
 */
export function categoryKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📁 File Code & Dự án', 'cat:DOWNLOAD')
    .row()
    .text('🔐 Tài khoản Bản quyền', 'cat:ACCOUNT')
    .row()
    .text('🔙 Quay lại Menu chính', 'nav:menu');
}

/**
 * Danh sách sản phẩm trong 1 danh mục
 */
export function productsListKeyboard(
  products: Array<{
    id: string;
    name: string;
    minPrice: number;
    stockText: string;
  }>,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  for (const p of products) {
    keyboard.text(`${p.name} · ${formatVnd(p.minPrice)}`, `prod:${p.id}`).row();
  }

  keyboard.text('🔙 Quay lại Menu', 'nav:menu');
  return keyboard;
}

/**
 * Bàn phím chi tiết sản phẩm: chọn biến thể & mua hàng
 */
export function productDetailKeyboard(params: {
  productId: string;
  category: 'ACCOUNT' | 'DOWNLOAD';
  variants: Array<{
    id: string;
    name: string;
    priceVnd: number;
    isAvailable: boolean;
  }>;
  previousEmail?: string | null;
}): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  for (const v of params.variants) {
    if (!v.isAvailable) {
      keyboard.text(`❌ ${v.name} (Hết hàng)`, 'noop').row();
    } else {
      keyboard.text(`⚡ Mua ${v.name} · ${formatVnd(v.priceVnd)}`, `buy:${v.id}`).row();
    }
  }

  keyboard.text('⬅️ Danh mục', `cat:${params.category}`).text('🏠 Menu chính', 'nav:menu');

  return keyboard;
}

/**
 * Bàn phím chọn nhanh Email hoặc nhập mới
 */
export function emailChoiceKeyboard(
  variantId: string,
  previousEmail?: string | null,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  if (previousEmail) {
    keyboard
      .text(`⚡ Dùng email: ${previousEmail}`, `use_email:${variantId}:${previousEmail}`)
      .row();
  }

  keyboard.text('✏️ Nhập email khác', `ask_email:${variantId}`).row();
  keyboard.text('❌ Hủy', 'nav:menu');

  return keyboard;
}

/**
 * Bàn phím thanh toán PayOS VietQR
 */
export function orderPaymentKeyboard(checkoutUrl: string, orderCode: string): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  if (isValidTelegramUrl(checkoutUrl)) {
    keyboard.url('💳 Mở cổng thanh toán PayOS', checkoutUrl).row();
  }

  keyboard
    .text('🔄 Kiểm tra thanh toán', `check:${orderCode}`)
    .row()
    .text('❌ Hủy đơn hàng', `cancel:${orderCode}`)
    .row()
    .text('🏠 Menu chính', 'nav:menu');

  return keyboard;
}

/**
 * Nút quay lại menu chính
 */
export function backToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('🔙 Quay lại Menu chính', 'nav:menu');
}
