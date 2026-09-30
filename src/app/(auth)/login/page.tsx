import { AuthCard } from '@/components/auth/auth-card';
import { Container } from '@/components/layout/container';
import { isGoogleAuthEnabled, isGitHubAuthEnabled } from '@/lib/auth.config';

interface Props {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

export const metadata = {
  title: 'Đăng nhập / Đăng ký tài khoản',
  description: 'Đăng nhập bằng Google, GitHub hoặc Email & Mật khẩu để quản lý tài khoản.',
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccountLocked:
    'Tài khoản đã bị khóa do vi phạm quy định (đủ 3 cảnh báo). Liên hệ admin nếu cần hỗ trợ.',
  Configuration:
    'Chưa cấu hình tài khoản Google OAuth trong file .env (cần điền AUTH_GOOGLE_ID và AUTH_GOOGLE_SECRET).',
  OAuthSignin: 'Không thể khởi tạo phiên đăng nhập Google. Vui lòng kiểm tra lại cấu hình.',
  OAuthCallback: 'Lỗi trong quá trình nhận phản hồi xác thực từ Google. Vui lòng thử lại.',
  OAuthCreateAccount: 'Không thể tạo tài khoản từ thông tin Google. Vui lòng thử lại sau.',
  OAuthAccountNotLinked:
    'Email này đã được dùng cho tài khoản khác trước đó. Hãy đăng nhập bằng hình thức ban đầu để liên kết.',
  AccessDenied: 'Bạn đã hủy bỏ xác thực hoặc từ chối cấp quyền.',
  GitHubBlockedGoogleEmail:
    'Email này đã được đăng ký bằng Google. Tài khoản này chỉ được phép đăng nhập bằng Google (để dùng GitHub, tài khoản GitHub cần sử dụng email khác).',
  GoogleBlockedGitHubEmail:
    'Email này đã được đăng ký bằng GitHub. Tài khoản này chỉ được phép đăng nhập bằng GitHub (để dùng Google, tài khoản Google cần sử dụng email khác).',
  CallbackRouteError:
    'Lỗi kết nối khi nhận phản hồi từ nhà cung cấp OAuth (mạng không ổn định hoặc timeout kết nối). Vui lòng thử lại.',
  Verification: 'Mã hoặc đường dẫn xác thực không hợp lệ hoặc đã hết hạn.',
  Default: 'Đã xảy ra lỗi trong quá trình xác thực. Vui lòng thử lại.',
};

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams;
  const targetUrl = callbackUrl || '/account';

  let message = error ? (AUTH_ERROR_MESSAGES[error] ?? error) : undefined;

  if (!message && targetUrl.startsWith('/checkout')) {
    message = 'Vui lòng đăng nhập để tiến hành đặt hàng và thanh toán.';
  }

  return (
    <Container className="flex min-h-[75vh] items-center justify-center py-12">
      <AuthCard
        callbackUrl={targetUrl}
        initialError={message}
        isGoogleConfigured={isGoogleAuthEnabled}
        isGithubConfigured={isGitHubAuthEnabled}
      />
    </Container>
  );
}
