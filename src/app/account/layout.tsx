import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Container } from '@/components/layout/container';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=/account');
  }

  return (
    <Container className="py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tài khoản của tôi</h1>
          <p className="text-muted-foreground">
            Quản lý thông tin cá nhân, đơn hàng và khoá bản quyền phần mềm đã mua.
          </p>
        </div>
        {children}
      </div>
    </Container>
  );
}
