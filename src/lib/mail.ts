import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { siteConfig } from '@/config/site';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail =
  process.env.EMAIL_FROM || `${siteConfig.name} <noreply@${new URL(siteConfig.url).hostname}>`;

/**
 * Khởi tạo Transporter cho Gmail SMTP qua Nodemailer
 */
export function getGmailTransporter(): Transporter {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');

  if (!user || !pass) {
    throw new Error('Chưa cấu hình GMAIL_USER hoặc GMAIL_APP_PASSWORD trong biến môi trường (.env).');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendMailOptions) {
  if (resend) {
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

  // Dự phòng gửi qua Gmail SMTP nếu Resend không có key
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  if (gmailUser && gmailPass) {
    try {
      const transporter = getGmailTransporter();
      const info = await transporter.sendMail({
        from: `"${siteConfig.name}" <${gmailUser}>`,
        to,
        subject,
        html,
        text,
      });
      return { success: true, data: info };
    } catch (error) {
      console.error('❌ Lỗi gửi email qua Gmail SMTP:', error);
      throw error;
    }
  }

  console.log('\n==========================================');
  console.log(`✉️ [MOCK EMAIL - No RESEND_API_KEY / GMAIL_CONFIG]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content:\n${text || html}`);
  console.log('==========================================\n');
  return { success: true, mock: true };
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
 * Gửi email chứa mã xác thực OTP đăng ký tài khoản (6 chữ số) qua Gmail SMTP + Nodemailer
 * Bắt buộc gửi bằng Gmail SMTP thật; ném lỗi nếu gửi thất bại hoặc chưa cấu hình.
 */
export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const transporter = getGmailTransporter();
  const user = process.env.GMAIL_USER?.trim();
  const from = `"${siteConfig.name}" <${user}>`;
  const subject = `[${code}] Mã xác nhận đăng ký tài khoản - ${siteConfig.name}`;
  const text = `Mã xác nhận đăng ký tài khoản ${siteConfig.name} của bạn là: ${code} (hiệu lực trong 10 phút).`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 700;">Xác thực tài khoản của bạn</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Chào mừng bạn đến với ${siteConfig.name}</p>
      </div>
      <p style="color: #334155; font-size: 15px; line-height: 24px; margin-bottom: 20px;">
        Cảm ơn bạn đã đăng ký tài khoản. Vui lòng sử dụng mã xác minh 6 chữ số bên dưới để hoàn tất việc đăng ký:
      </p>
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563eb;">${code}</span>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 20px;">
        Mã xác minh này có hiệu lực trong vòng <strong>10 phút</strong>. Vì lý do bảo mật, tuyệt đối không chia sẻ mã này cho bất kỳ ai.
      </p>
      <p style="color: #64748b; font-size: 13px; line-height: 20px; margin-top: 12px;">
        Nếu bạn không thực hiện yêu cầu đăng ký này, bạn có thể an tâm bỏ qua email này.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        ${siteConfig.name} &bull; <a href="${siteConfig.url}" style="color: #2563eb; text-decoration: none;">${siteConfig.url}</a>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });
}

/**
 * Tương thích ngược với interface { to, code } hoặc (email, code)
 */
export async function sendVerificationCodeEmail(
  toOrOptions: string | { to: string; code: string },
  maybeCode?: string,
): Promise<void> {
  if (typeof toOrOptions === 'object') {
    return sendVerificationEmail(toOrOptions.to, toOrOptions.code);
  }
  return sendVerificationEmail(toOrOptions, maybeCode!);
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
  paymentMethod: 'PAYOS' | 'COD' | 'WALLET';
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
         Thanh toán: ${paymentMethod === 'COD' ? 'COD khi nhận hàng' : paymentMethod === 'WALLET' ? 'Ví tài khoản (đã trừ ví)' : 'PayOS'}<br />
         Tổng tiền: <strong>${totalVnd.toLocaleString('vi-VN')} đ</strong>
       </p>
       <p><a href="${siteConfig.url}/admin/orders" style="color: #2563eb;">Mở trang quản lý đơn hàng</a></p>`,
    ),
    text: `Đơn mới ${orderCode} (${paymentMethod}) — ${totalVnd.toLocaleString('vi-VN')} đ từ ${customerName} ${phone}.`,
  });
}

/**
 * Gửi thông tin tài khoản số cho khách sau khi thanh toán thành công.
 * Chuỗi truyền vào đây đã được giải mã — nơi gọi phải ghi CredentialAccessLog.
 */
export async function sendAccountDeliveryEmail({
  to,
  orderCode,
  accounts,
}: {
  to: string;
  orderCode: string;
  accounts: Array<{ label: string; credentials: string }>;
}) {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const blocks = accounts
    .map(
      (account) => `
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
        <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 15px;">${escapeHtml(account.label)}</h3>
        <pre style="margin: 0; white-space: pre-wrap; word-break: break-all; font-family: ui-monospace, monospace; font-size: 14px; color: #1f2937;">${escapeHtml(account.credentials)}</pre>
      </div>`,
    )
    .join('');

  return sendEmail({
    to,
    subject: `[Bàn giao tài khoản] Đơn hàng ${orderCode} tại ${siteConfig.name}`,
    html: orderEmailShell(
      'Thông tin tài khoản của bạn',
      `<p style="color: #4b5563; font-size: 15px;">Đơn hàng <strong>${orderCode}</strong> đã thanh toán thành công. Dưới đây là thông tin đăng nhập:</p>
       ${blocks}
       <p style="color: #6b7280; font-size: 13px;">Vui lòng đổi mật khẩu phụ (nếu có) và không chia sẻ thông tin này cho người khác. Mọi vấn đề về bảo hành xin liên hệ lại đơn hàng này.</p>`,
    ),
    text: accounts.map((account) => `${account.label}\n${account.credentials}`).join('\n\n'),
  });
}

/** Báo admin có tài khoản cần bàn giao thủ công. */
export async function sendAdminManualDeliveryEmail({
  orderCode,
  items,
}: {
  orderCode: string;
  items: string[];
}) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return { success: true, skipped: true };

  return sendEmail({
    to,
    subject: `[Cần bàn giao] Đơn ${orderCode} có tài khoản giao thủ công`,
    html: orderEmailShell(
      'Đơn hàng cần bàn giao tài khoản',
      `<p style="color: #4b5563; font-size: 15px;">Đơn <strong>${orderCode}</strong> đã thanh toán và đang chờ bạn gửi thông tin tài khoản:</p>
       <ul style="color: #4b5563; font-size: 14px;">${items.map((item) => `<li>${item}</li>`).join('')}</ul>
       <p><a href="${siteConfig.url}/admin/orders" style="color: #2563eb;">Mở trang quản lý đơn hàng</a></p>`,
    ),
    text: `Đơn ${orderCode} cần bàn giao tài khoản: ${items.join(', ')}.`,
  });
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Báo tài khoản bị cảnh báo (thường kèm gỡ bài); đủ số cảnh báo thì báo đã khóa tài khoản. */
export async function sendUserWarningEmail({
  to,
  reason,
  postTitle,
  warningCount,
  limit,
  locked,
}: {
  to: string;
  reason: string;
  postTitle?: string | null;
  warningCount: number;
  limit: number;
  locked: boolean;
}) {
  const subject = locked
    ? 'Tài khoản của bạn đã bị khóa'
    : `Cảnh báo vi phạm (${warningCount}/${limit})`;
  const postLine = postTitle
    ? `<p style="color:#4b5563;font-size:15px;">Bài viết <strong>${escapeHtml(postTitle)}</strong> đã bị gỡ.</p>`
    : '';
  const status = locked
    ? `Tài khoản đã nhận ${warningCount} cảnh báo nên đã bị khóa và không thể đăng nhập.`
    : `Đây là cảnh báo ${warningCount}/${limit}. Đủ ${limit} cảnh báo tài khoản sẽ bị khóa.`;
  return sendEmail({
    to,
    subject,
    html: orderEmailShell(
      subject,
      `${postLine}<p style="color:#4b5563;font-size:15px;">Lý do: ${escapeHtml(reason)}</p><p style="color:#4b5563;font-size:15px;">${status}</p>`,
    ),
    text: `${postTitle ? `Bài viết "${postTitle}" đã bị gỡ. ` : ''}Lý do: ${reason}. ${status}`,
  });
}
