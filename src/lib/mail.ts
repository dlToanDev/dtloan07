import { Resend } from 'resend';
import { siteConfig } from '@/config/site';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail =
  process.env.EMAIL_FROM || `${siteConfig.name} <noreply@${new URL(siteConfig.url).hostname}>`;

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendMailOptions) {
  if (!resend) {
    console.log('\n==========================================');
    console.log(`✉️ [MOCK EMAIL - No RESEND_API_KEY]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${text || html}`);
    console.log('==========================================\n');
    return { success: true, mock: true };
  }

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text,
    });
    return { success: true, data };
  } catch (error) {
    console.error('❌ Lỗi gửi email qua Resend:', error);
    throw error;
  }
}

/**
 * Gửi email đăng nhập Magic Link
 */
export async function sendMagicLinkEmail({ to, url }: { to: string; url: string }) {
  const subject = `Đăng nhập vào ${siteConfig.name}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #111827; margin-bottom: 16px;">Đăng nhập vào ${siteConfig.name}</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px;">
        Chào bạn, bấm vào nút bên dưới để đăng nhập an toàn vào tài khoản của bạn. Link này có hiệu lực trong 24 giờ.
      </p>
      <div style="margin: 32px 0;">
        <a href="${url}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
          Đăng nhập ngay
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 20px;">
        Nếu bạn không yêu cầu email này, bạn có thể yên tâm bỏ qua nó.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        ${siteConfig.name} &bull; <a href="${siteConfig.url}" style="color: #9ca3af;">${siteConfig.url}</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Đăng nhập vào ${siteConfig.name} bằng link: ${url}`,
  });
}

/**
 * Gửi email xác nhận Lead Magnet (Double Opt-in)
 */
export async function sendLeadMagnetConfirmEmail({
  to,
  confirmUrl,
  leadTitle,
}: {
  to: string;
  confirmUrl: string;
  leadTitle?: string;
}) {
  const title = leadTitle || 'Tài liệu kỹ thuật miễn phí';
  const subject = `Xác nhận nhận tài liệu: ${title}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #111827; margin-bottom: 16px;">Xác nhận nhận tài liệu miễn phí</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px;">
        Cảm ơn bạn đã đăng ký nhận tài liệu <strong>"${title}"</strong> từ ${siteConfig.name}.
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px;">
        Vui lòng bấm vào nút bên dưới để xác nhận email của bạn và nhận link tải tài liệu:
      </p>
      <div style="margin: 32px 0;">
        <a href="${confirmUrl}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
          Xác nhận & Tải tài liệu
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 20px;">
        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        Để huỷ đăng ký nhận thông báo trong tương lai, bạn có thể bấm vào <a href="${siteConfig.url}/unsubscribe" style="color: #9ca3af;">Huỷ đăng ký</a>.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Bấm vào link sau để xác nhận và nhận tài liệu "${title}": ${confirmUrl}`,
  });
}

/**
 * Gửi email bàn giao mã bản quyền License và link tải file sau khi thanh toán thành công
 */
export async function sendOrderLicenseEmail({
  to,
  orderCode,
  licenses,
}: {
  to: string;
  orderCode: string;
  licenses: Array<{
    productName: string;
    licenseKey: string;
    downloadUrl: string;
  }>;
}) {
  const subject = `[Bàn giao bản quyền] Đơn hàng ${orderCode} tại ${siteConfig.name}`;
  const licensesHtml = licenses
    .map(
      (lic) => `
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 16px;">${lic.productName}</h3>
        <p style="margin: 4px 0; color: #4b5563; font-size: 14px;">
          Mã bản quyền: <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #1f2937;">${lic.licenseKey}</code>
        </p>
        <div style="margin-top: 12px;">
          <a href="${lic.downloadUrl}" style="background-color: #2563eb; color: #ffffff; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
            Tải tệp tin (.zip)
          </a>
        </div>
      </div>
    `,
    )
    .join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #111827; margin-bottom: 8px;">Thanh toán thành công!</h2>
      <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px;">
        Cảm ơn bạn đã mua sản phẩm số tại ${siteConfig.name}. Dưới đây là thông tin khoá bản quyền và liên kết tải tài liệu cho mã đơn hàng <strong>${orderCode}</strong>:
      </p>

      ${licensesHtml}

      <p style="color: #6b7280; font-size: 13px; line-height: 18px; margin-top: 20px;">
        * Lưu ý: Mỗi liên kết tải xuống có giới hạn số lượt tải tối đa và tự động bảo vệ qua signed URL. Bạn có thể đăng nhập vào mục <a href="${siteConfig.url}/account" style="color: #2563eb;">Tài khoản</a> bất kỳ lúc nào để xem lại danh sách license.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        ${siteConfig.name} &bull; Hotline / Hỗ trợ: <a href="mailto:${siteConfig.author.email}" style="color: #9ca3af;">${siteConfig.author.email}</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Đơn hàng ${orderCode} đã thanh toán thành công. Vui lòng kiểm tra email dạng HTML hoặc truy cập ${siteConfig.url}/account để nhận mã bản quyền.`,
  });
}

// ============================================================
// Đơn hàng vật lý: xác nhận, đổi trạng thái giao hàng, báo admin
// ============================================================

const FULFILLMENT_LABEL: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận, đang chuẩn bị hàng',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao thành công',
  CANCELLED: 'Đã hủy',
};

function orderEmailShell(title: string, bodyHtml: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #111827; margin-bottom: 8px;">${title}</h2>
      ${bodyHtml}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        ${siteConfig.name} &bull; Hỗ trợ: <a href="mailto:${siteConfig.author.email}" style="color: #9ca3af;">${siteConfig.author.email}</a>
      </p>
    </div>
  `;
}

/** Xác nhận đã nhận đơn — dùng cho đơn COD (đơn PayOS đã có email sau khi thanh toán). */
export async function sendOrderReceivedEmail({
  to,
  orderCode,
  totalVnd,
  paymentMethod,
}: {
  to: string;
  orderCode: string;
  totalVnd: number;
  paymentMethod: 'PAYOS' | 'COD';
}) {
  const subject = `[Đã nhận đơn ${orderCode}] ${siteConfig.name}`;
  const payLine =
    paymentMethod === 'COD'
      ? `Bạn thanh toán <strong>${totalVnd.toLocaleString('vi-VN')} đ</strong> cho đơn vị vận chuyển khi nhận hàng.`
      : `Tổng thanh toán: <strong>${totalVnd.toLocaleString('vi-VN')} đ</strong>.`;

  return sendEmail({
    to,
    subject,
    html: orderEmailShell(
      'Đã nhận đơn hàng của bạn',
      `<p style="color: #4b5563; font-size: 15px;">Mã đơn <strong>${orderCode}</strong> đã được ghi nhận. ${payLine}</p>
       <p style="color: #4b5563; font-size: 15px;">Chúng tôi sẽ liên hệ xác nhận trước khi giao. Bạn có thể tra cứu đơn tại
       <a href="${siteConfig.url}/orders/lookup" style="color: #2563eb;">trang tra cứu đơn hàng</a>.</p>`,
    ),
    text: `Đã nhận đơn ${orderCode}. Tổng tiền ${totalVnd.toLocaleString('vi-VN')} đ.`,
  });
}

/** Báo khách khi trạng thái giao hàng đổi. */
export async function sendOrderStatusEmail({
  to,
  orderCode,
  status,
  trackingCode,
}: {
  to: string;
  orderCode: string;
  status: keyof typeof FULFILLMENT_LABEL | string;
  trackingCode?: string | null;
}) {
  const label = FULFILLMENT_LABEL[status] ?? status;
  const subject = `[${label}] Đơn hàng ${orderCode}`;
  const trackingHtml = trackingCode
    ? `<p style="color: #4b5563; font-size: 15px;">Mã vận đơn: <code style="background-color:#e5e7eb;padding:2px 6px;border-radius:4px;">${trackingCode}</code></p>`
    : '';

  return sendEmail({
    to,
    subject,
    html: orderEmailShell(
      label,
      `<p style="color: #4b5563; font-size: 15px;">Đơn hàng <strong>${orderCode}</strong> của bạn: ${label}.</p>${trackingHtml}`,
    ),
    text: `Đơn hàng ${orderCode}: ${label}.${trackingCode ? ` Mã vận đơn: ${trackingCode}.` : ''}`,
  });
}

/** Báo admin có đơn cần xử lý. Bỏ qua im lặng nếu chưa cấu hình ADMIN_NOTIFY_EMAIL. */
export async function sendAdminNewOrderEmail({
  orderCode,
  totalVnd,
  customerName,
  phone,
  paymentMethod,
}: {
  orderCode: string;
  totalVnd: number;
  customerName: string;
  phone: string;
  paymentMethod: 'PAYOS' | 'COD';
}) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return { success: true, skipped: true };

  return sendEmail({
    to,
    subject: `[Đơn mới ${paymentMethod}] ${orderCode} — ${totalVnd.toLocaleString('vi-VN')} đ`,
    html: orderEmailShell(
      'Có đơn hàng mới cần xử lý',
      `<p style="color: #4b5563; font-size: 15px;">
         Mã đơn: <strong>${orderCode}</strong><br />
         Khách: ${customerName} — ${phone}<br />
         Thanh toán: ${paymentMethod === 'COD' ? 'COD khi nhận hàng' : 'PayOS'}<br />
         Tổng tiền: <strong>${totalVnd.toLocaleString('vi-VN')} đ</strong>
       </p>
       <p><a href="${siteConfig.url}/admin/orders" style="color: #2563eb;">Mở trang quản lý đơn hàng</a></p>`,
    ),
    text: `Đơn mới ${orderCode} (${paymentMethod}) — ${totalVnd.toLocaleString('vi-VN')} đ từ ${customerName} ${phone}.`,
  });
}
