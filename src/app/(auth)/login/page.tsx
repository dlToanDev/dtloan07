import { AuthCard } from '@/components/auth/auth-card';
import { Container } from '@/components/layout/container';

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

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams;
  const targetUrl = callbackUrl || '/account';
  let message =
    error === 'AccountLocked'
      ? 'Tài khoản đã bị khóa do vi phạm quy định (đủ 3 cảnh báo). Liên hệ admin nếu cần hỗ trợ.'
      : error;

  if (!message && targetUrl.startsWith('/checkout')) {
    message = 'Vui lòng đăng nhập để tiến hành đặt hàng và thanh toán.';
  }

  return (
    <Container className="flex min-h-[75vh] items-center justify-center py-12">
      <AuthCard callbackUrl={targetUrl} initialError={message} />
    </Container>
  );
}
