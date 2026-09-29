'use client';

import { useState, useEffect } from 'react';
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
import { sendRegistrationOtp, verifyOtpAndRegister } from '@/server/actions/auth';
import { signIn } from 'next-auth/react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

interface AuthCardProps {
  callbackUrl?: string;
  initialError?: string;
  isGoogleConfigured?: boolean;
  isGithubConfigured?: boolean;
}

export function AuthCard({
  callbackUrl = '/account',
  initialError,
  isGoogleConfigured = true,
  isGithubConfigured = true,
}: AuthCardProps) {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER' | 'MAGIC'>('LOGIN');

  // Form states - Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states - Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Register steps: 'INPUT' (nhập thông tin) -> 'OTP' (nhập mã xác nhận gửi về email)
  const [registerStep, setRegisterStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status states
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError || null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Bộ đếm lùi thời gian cho nút gửi lại mã OTP (60s)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // 1. Đăng nhập bằng Google / GitHub OAuth
  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    if (provider === 'google' && !isGoogleConfigured) {
      setErrorMsg(
        'Đăng nhập Google chưa khả dụng do chưa điền AUTH_GOOGLE_ID và AUTH_GOOGLE_SECRET vào file .env.',
      );
      return;
    }
    if (provider === 'github' && !isGithubConfigured) {
      setErrorMsg(
        'Đăng nhập GitHub chưa khả dụng do chưa điền AUTH_GITHUB_ID và AUTH_GITHUB_SECRET vào file .env.',
      );
      return;
    }

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

  // 3. Bước 1 đăng ký: Gửi mã OTP xác minh về Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (regPassword.length < 8) {
      setErrorMsg('Mật khẩu phải có độ dài tối thiểu 8 ký tự.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
      return;
    }

    setLoading(true);

    try {
      const res = await sendRegistrationOtp(
        regEmail,
        regPassword,
        regConfirmPassword,
        regName,
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Không thể gửi mã xác thực. Vui lòng thử lại.');
      } else {
        setRegisterStep('OTP');
        setResendCooldown(60);
        setSuccessMsg(res.message || 'Mã xác thực đã được gửi về email của bạn!');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ khi gửi mã xác thực.');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await sendRegistrationOtp(
        regEmail,
        regPassword,
        regConfirmPassword,
        regName,
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Không thể gửi lại mã xác nhận.');
      } else {
        setResendCooldown(60);
        setSuccessMsg('Đã gửi mã xác nhận mới! Vui lòng kiểm tra email.');
      }
    } catch {
      setErrorMsg('Lỗi khi gửi lại mã xác nhận.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Bước 2 đăng ký: Xác nhận mã OTP và tạo tài khoản
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      setErrorMsg('Vui lòng nhập đúng mã xác nhận gồm 6 chữ số.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await verifyOtpAndRegister({
        emailRaw: regEmail,
        passwordRaw: regPassword,
        confirmPasswordRaw: regConfirmPassword,
        codeRaw: otpCode,
        nameRaw: regName,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Mã xác thực không hợp lệ.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Xác thực email thành công! Đang tự động đăng nhập...');

      // Tự động đăng nhập người dùng ngay sau khi tạo tài khoản thành công
      const loginRes = await signIn('credentials', {
        email: regEmail.trim(),
        password: regPassword,
        redirect: false,
        callbackUrl,
      });

      if (loginRes?.url) {
        window.location.href = loginRes.url;
      } else {
        window.location.href = callbackUrl;
      }
    } catch {
      setErrorMsg('Lỗi trong quá trình tạo tài khoản. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  // 5. Đăng nhập bằng Magic Link
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

  const isPasswordValid = regPassword.length >= 8;
  const isPasswordMatch = regPassword.length > 0 && regPassword === regConfirmPassword;

  return (
    <Card className="border-border bg-card w-full max-w-md shadow-xl">
      <CardHeader className="pb-4 text-center">
        <CardTitle as="h1" className="text-2xl font-bold tracking-tight">
          {activeTab === 'REGISTER'
            ? registerStep === 'OTP'
              ? 'Xác minh Email'
              : 'Tạo tài khoản mới'
            : activeTab === 'MAGIC'
              ? 'Đăng nhập không cần mật khẩu'
              : 'Đăng nhập tài khoản'}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {activeTab === 'REGISTER'
            ? registerStep === 'OTP'
              ? 'Nhập mã 6 số được gửi về email của bạn để kích hoạt tài khoản'
              : 'Đăng ký tài khoản bảo mật để truy cập toàn bộ dịch vụ'
            : 'Đăng nhập bằng Google, GitHub hoặc Email & Mật khẩu'}
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
              activeTab === 'LOGIN'
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
              setRegisterStep('INPUT');
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
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-600 dark:text-rose-400"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success notification */}
        {successMsg && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* NÚT OAUTH: GOOGLE & GITHUB (Chỉ hiện ở màn hình Đăng nhập hoặc Đăng ký bước 1) */}
        {!(activeTab === 'REGISTER' && registerStep === 'OTP') && (
          <>
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
                hoặc dùng email & mật khẩu
              </span>
            </div>
          </>
        )}

        {/* TAB 1: ĐĂNG NHẬP BẰNG MẬT KHẨU */}
        {activeTab === 'LOGIN' && (
          <form onSubmit={handleCredentialsLogin} className="space-y-3">
            <div>
              <label className="text-xs font-semibold">Địa chỉ Email</label>
              <div className="relative mt-1">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={loading}
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
                  disabled={loading}
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
          <>
            {/* BƯỚC 1: NHẬP THÔNG TIN (EMAIL, MẬT KHẨU >= 8 KÝ TỰ, NHẬP LẠI MẬT KHẨU) */}
            {registerStep === 'INPUT' && (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold">Họ và tên (tuỳ chọn)</label>
                  <div className="relative mt-1">
                    <User className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      disabled={loading}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold">
                    Địa chỉ Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="ban@example.com"
                      required
                      disabled={loading}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold">
                      Mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[11px] ${
                        regPassword.length === 0
                          ? 'text-muted-foreground'
                          : isPasswordValid
                            ? 'text-emerald-600 font-medium dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {regPassword.length === 0
                        ? 'Tối thiểu 8 ký tự'
                        : isPasswordValid
                          ? '✓ Đạt yêu cầu'
                          : `${regPassword.length}/8 ký tự`}
                    </span>
                  </div>
                  <div className="relative mt-1">
                    <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Nhập ít nhất 8 ký tự"
                      required
                      minLength={8}
                      disabled={loading}
                      className="pr-9 pl-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                    >
                      {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold">
                      Nhập lại mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    {regConfirmPassword.length > 0 && (
                      <span
                        className={`text-[11px] font-medium ${
                          isPasswordMatch
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPasswordMatch ? '✓ Khớp mật khẩu' : '✕ Chưa khớp'}
                      </span>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <ShieldCheck className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Nhập lại chính xác mật khẩu"
                      required
                      minLength={8}
                      disabled={loading}
                      className="pr-9 pl-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                    >
                      {showRegConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !isPasswordValid || !isPasswordMatch}
                  className="mt-3 w-full font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Đang gửi mã xác nhận...
                    </>
                  ) : (
                    'Gửi mã xác nhận về Email'
                  )}
                </Button>
              </form>
            )}

            {/* BƯỚC 2: NHẬP MÃ XÁC THỰC OTP GỬI VỀ EMAIL */}
            {registerStep === 'OTP' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-center text-xs">
                  <Mail className="text-primary mx-auto mb-1.5 size-6" />
                  <p className="text-muted-foreground leading-relaxed">
                    Mã xác nhận 6 chữ số đã được gửi tới:
                  </p>
                  <p className="font-bold text-foreground text-sm mt-0.5">{regEmail}</p>
                  <p className="text-muted-foreground text-[11px] mt-1">
                    Vui lòng kiểm tra hộp thư chính hoặc mục Thư rác (Spam).
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold flex items-center justify-between">
                    <span>Mã xác thực 6 số</span>
                    <span className="text-[11px] text-muted-foreground">Hiệu lực 10 phút</span>
                  </label>
                  <div className="relative mt-1">
                    <KeyRound className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      autoFocus
                      disabled={loading}
                      className="pl-9 text-center font-mono text-lg font-bold tracking-widest"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || otpCode.trim().length !== 6}
                  className="w-full font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Đang xác thực & tạo tài khoản...
                    </>
                  ) : (
                    'Xác nhận & Hoàn tất đăng ký'
                  )}
                </Button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterStep('INPUT');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" /> Sửa thông tin
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className={`inline-flex items-center gap-1 ${
                      resendCooldown > 0
                        ? 'text-muted-foreground cursor-not-allowed'
                        : 'text-primary font-medium hover:underline'
                    }`}
                  >
                    <RotateCcw className="size-3.5" />
                    {resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : 'Gửi lại mã'}
                  </button>
                </div>
              </form>
            )}
          </>
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
                  disabled={loading}
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
          Bằng việc đăng ký hoặc đăng nhập, bạn đồng ý với{' '}
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
