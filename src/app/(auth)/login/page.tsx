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

  return (
    <Container className="flex min-h-[75vh] items-center justify-center py-12">
      <AuthCard callbackUrl={targetUrl} initialError={error} />
    </Container>
  );
}
