'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { registerUser } from '@/server/actions/auth';
import { signIn } from 'next-auth/react';
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface AuthCardProps {
  callbackUrl?: string;
  initialError?: string;
}

export function AuthCard({ callbackUrl = '/account', initialError }: AuthCardProps) {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER' | 'MAGIC'>('LOGIN');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError || null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Đăng nhập bằng Google / GitHub
  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    setErrorMsg(null);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setErrorMsg(
        `Không thể kết nối tới ${provider === 'google' ? 'Google' : 'GitHub'}. Vui lòng thử lại.`,
      );
      setOauthLoading(null);
    }
  };

  // 2. Đăng nhập bằng Email + Mật khẩu
  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setErrorMsg('Email hoặc mật khẩu không chính xác.');
      } else if (res?.url) {
        window.location.href = res.url;
      } else {
        window.location.href = callbackUrl;
      }
    } catch {
      setErrorMsg('Lỗi máy chủ khi đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Đăng ký tài khoản mới
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('name', name);

    try {
      const res = await registerUser(formData);
      if (!res.success) {
        setErrorMsg(res.error || 'Đăng ký không thành công.');
      } else {
        setSuccessMsg('Đăng ký tài khoản thành công! Đang tự động đăng nhập...');
        // Tự động đăng nhập luôn
        const loginRes = await signIn('credentials', {
          email: email.trim(),
          password,
          redirect: false,
          callbackUrl,
        });

        if (loginRes?.url) {
          window.location.href = loginRes.url;
        } else {
          setActiveTab('LOGIN');
          setSuccessMsg('Đăng ký thành công! Hãy nhập mật khẩu để đăng nhập.');
        }
      }
    } catch {
      setErrorMsg('Lỗi trong quá trình tạo tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Đăng nhập bằng Magic Link
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await signIn('resend', {
        email: email.trim(),
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setErrorMsg('Không thể gửi liên kết đăng nhập. Vui lòng kiểm tra lại email.');
      } else {
        setSuccessMsg('Đã gửi liên kết Magic Link! Vui lòng kiểm tra hộp thư email của bạn.');
      }
    } catch {
      setErrorMsg('Lỗi khi gửi email xác thực.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card w-full max-w-md shadow-xl">
      <CardHeader className="pb-4 text-center">
        <CardTitle as="h1" className="text-2xl font-bold tracking-tight">
          {activeTab === 'REGISTER' ? 'Tạo tài khoản mới' : 'Đăng nhập'}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {activeTab === 'REGISTER'
            ? 'Đăng ký để lưu trữ đơn hàng, bản quyền license và nhận ưu đãi'
            : 'Đăng nhập an toàn bằng Google, GitHub hoặc Mật khẩu'}
        </CardDescription>

        {/* Tab Switcher: Đăng nhập / Đăng ký */}
        <div className="bg-muted mt-3 grid grid-cols-2 rounded-lg p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('LOGIN');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`rounded-md py-1.5 transition ${
              activeTab !== 'REGISTER'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('REGISTER');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`rounded-md py-1.5 transition ${
              activeTab === 'REGISTER'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Đăng ký tài khoản
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Error notification */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-600 dark:text-rose-400">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success notification */}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* NÚT OAUTH: GOOGLE & GITHUB */}
        <div className="grid grid-cols-2 gap-2">
          {/* Google */}
          <Button
            variant="outline"
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={oauthLoading !== null || loading}
            className="border-border h-10 w-full gap-2 text-xs font-medium"
          >
            {oauthLoading === 'google' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Google</span>
          </Button>

          {/* GitHub */}
          <Button
            variant="outline"
            type="button"
            onClick={() => handleOAuthLogin('github')}
            disabled={oauthLoading !== null || loading}
            className="border-border h-10 w-full gap-2 text-xs font-medium"
          >
            {oauthLoading === 'github' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            )}
            <span>GitHub</span>
          </Button>
        </div>

        <div className="after:border-border relative my-2 text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-card text-muted-foreground relative z-10 px-2 text-[11px] uppercase">
            hoặc qua email & mật khẩu
          </span>
        </div>

        {/* TAB 1: ĐĂNG NHẬP BẰNG MẬT KHẨU */}
        {activeTab === 'LOGIN' && (
          <form onSubmit={handleCredentialsLogin} className="space-y-3">
            <div>
              <label className="text-xs font-semibold">Email</label>
              <div className="relative mt-1">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Mật khẩu</label>
                <button
                  type="button"
                  onClick={() => setActiveTab('MAGIC')}
                  className="text-primary text-xs hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative mt-1">
                <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-9 pl-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="mt-2 w-full font-semibold">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập tài khoản'
              )}
            </Button>
          </form>
        )}

        {/* TAB 2: ĐĂNG KÝ TÀI KHOẢN MỚI */}
        {activeTab === 'REGISTER' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="text-xs font-semibold">Họ và tên</label>
              <div className="relative mt-1">
                <User className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold">Email *</label>
              <div className="relative mt-1">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@example.com"
                  required
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold">
                Mật khẩu khởi tạo * (tối thiểu 6 ký tự)
              </label>
              <div className="relative mt-1">
                <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu ít nhất 6 ký tự"
                  required
                  minLength={6}
                  className="pr-9 pl-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="mt-2 w-full font-semibold">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Đang tạo tài khoản...
                </>
              ) : (
                'Tạo tài khoản ngay'
              )}
            </Button>
          </form>
        )}

        {/* TAB 3: ĐĂNG NHẬP MAGIC LINK (EMAIL KHÔNG CẦN MẬT KHẨU) */}
        {activeTab === 'MAGIC' && (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <div>
              <label className="text-xs font-semibold">Email nhận liên kết đăng nhập</label>
              <div className="relative mt-1">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhap-email@example.com"
                  required
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full font-semibold">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Đang gửi...
                </>
              ) : (
                'Gửi link đăng nhập qua Email'
              )}
            </Button>

            <button
              type="button"
              onClick={() => setActiveTab('LOGIN')}
              className="text-muted-foreground hover:text-foreground w-full pt-1 text-center text-xs"
            >
              ← Quay lại đăng nhập bằng mật khẩu
            </button>
          </form>
        )}
      </CardContent>

      <CardFooter className="border-border text-muted-foreground flex flex-col items-center justify-center gap-1 border-t pt-4 text-center text-xs">
        <p>
          Bằng việc đăng nhập, bạn đồng ý với{' '}
          <Link href="/terms" className="hover:text-foreground underline">
            Điều khoản dịch vụ
          </Link>{' '}
          và{' '}
          <Link href="/privacy" className="hover:text-foreground underline">
            Chính sách bảo mật
          </Link>
          .
        </p>
      </CardFooter>
    </Card>
  );
}
