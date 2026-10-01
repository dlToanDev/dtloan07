'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  User,
  Crown,
  Key,
  Package,
  Ticket,
  FileText,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Clock,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  PenLine,
  LogOut,
  Save,
  Lock,
  Calendar,
  Zap,
  Gift,
  Truck,
  MessageCircle,
  Upload,
  Camera,
  MapPin,
  GraduationCap,
  Settings,
  ShieldCheck,
  Loader2,
  Wallet,
  Coins,
  QrCode,
  Building2,
  CircleDollarSign,
  RefreshCw,
  Landmark,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button, buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { BuyProButton } from '@/components/pro/buy-pro-button';
import { updateProfile, changePassword, uploadAvatar } from '@/server/actions/profile';
import {
  createDepositPaymentLink,
  instantDepositWallet,
  exchangeWalletCurrency,
  withdrawWalletFunds,
} from '@/server/actions/wallet';
import {
  USD_TO_VND_RATE,
  POPULAR_BANKS,
  type WalletData,
  type WalletTransactionItem,
} from '@/lib/wallet';
import { PRO_PLANS, PRO_BENEFITS, type MembershipPlanValue } from '@/lib/membership';
import { describeVoucher, voucherStatus } from '@/lib/coupon-labels';
import { WARNING_LIMIT } from '@/lib/community/rules';
import { cn } from '@/lib/utils';
import { QrDepositModal, type QrDepositData } from '@/components/wallet/qr-deposit-modal';
import { paymentStatusLabel, paymentStatusBadgeVariant } from '@/lib/shop/labels';

export type { WalletData, WalletTransactionItem };

export interface ProfileUserData {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  proUntil: Date | null;
  createdAt: Date;
  hasPassword: boolean;
  age?: number | null;
  address?: string | null;
  education?: string | null;
  bio?: string | null;
  balanceVnd?: number;
  balanceUsd?: number;
}

export interface ProfileManagerProps {
  user: ProfileUserData;
  pro: boolean;
  daysLeft: number;
  warnings: { id: string; reason: string; createdAt: Date }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  licenses: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  grants: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posts: any[];
  wallet?: WalletData;
  initialTab?: string;
  orderCode?: string;
  cancelled?: boolean;
  signOutAction: () => Promise<void>;
}

const PLAN_ORDER: MembershipPlanValue[] = ['PRO_MONTH', 'PRO_YEAR'];

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
];

export function ProfileManager({
  user,
  pro,
  daysLeft,
  warnings,
  licenses,
  orders,
  grants,
  posts,
  wallet = { balanceVnd: 0, balanceUsd: 0, transactions: [] },
  initialTab = 'profile',
  orderCode,
  cancelled,
  signOutAction,
}: ProfileManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTabParam = searchParams.get('tab') || initialTab;
  const [activeTab, setActiveTab] = useState(activeTabParam);

  // Profile Form States
  const [name, setName] = useState(user.name || '');
  const [imageUrl, setImageUrl] = useState(user.image || '');
  const [age, setAge] = useState(user.age != null ? String(user.age) : '');
  const [address, setAddress] = useState(user.address || '');
  const [education, setEducation] = useState(user.education || '');
  const [bio, setBio] = useState(user.bio || '');
  const [isUpdatingProfile, startUpdateProfile] = useTransition();
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Wallet States
  const [selectedCurrency, setSelectedCurrency] = useState<'VND' | 'USD'>('VND');
  const [depositAmount, setDepositAmount] = useState<string>('100000');
  const [depositMethod, setDepositMethod] = useState<'PAYOS' | 'INSTANT' | 'TRANSFER'>('PAYOS');
  const [isDepositing, startDeposit] = useTransition();
  const [walletMessage, setWalletMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [qrDepositData, setQrDepositData] = useState<QrDepositData | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Currency Exchange States (USD ⇄ VND)
  const [exchangeDirection, setExchangeDirection] = useState<'USD_TO_VND' | 'VND_TO_USD'>(
    'USD_TO_VND',
  );
  const [exchangeAmount, setExchangeAmount] = useState<string>('10');
  const [isExchanging, startExchange] = useTransition();
  const [exchangeMessage, setExchangeMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Withdraw States (Admin Only)
  const [withdrawCurrency, setWithdrawCurrency] = useState<'VND' | 'USD'>('VND');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawBankName, setWithdrawBankName] = useState<string>('MB Bank (Quân Đội)');
  const [customBankName, setCustomBankName] = useState<string>('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState<string>('');
  const [withdrawAccountName, setWithdrawAccountName] = useState<string>('');
  const [withdrawNote, setWithdrawNote] = useState<string>('');
  const [isWithdrawing, startWithdraw] = useTransition();
  const [withdrawMessage, setWithdrawMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Tổng số dư quy đổi tham chiếu
  const totalInVnd = wallet.balanceVnd + Math.round(wallet.balanceUsd * USD_TO_VND_RATE);
  const totalInUsd = Number((wallet.balanceVnd / USD_TO_VND_RATE + wallet.balanceUsd).toFixed(2));

  // Chế độ xoay tua hiển thị tiền tệ (USD ⇄ VND)
  const defaultWalletMode: 'USD' | 'VND' | 'DUAL' =
    wallet.balanceUsd > 0 && wallet.balanceVnd === 0 ? 'USD' : 'VND';
  const [walletDisplayMode, setWalletDisplayMode] = useState<'USD' | 'VND' | 'DUAL'>(
    defaultWalletMode,
  );
  const [proModalOpen, setProModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('blog_wallet_currency_mode') as 'USD' | 'VND' | 'DUAL';
    if (saved && ['USD', 'VND', 'DUAL'].includes(saved)) {
      setWalletDisplayMode(saved);
    }

    const handleModeChange = () => {
      const updated = localStorage.getItem('blog_wallet_currency_mode') as 'USD' | 'VND' | 'DUAL';
      if (updated && ['USD', 'VND', 'DUAL'].includes(updated)) {
        setWalletDisplayMode(updated);
      }
    };

    window.addEventListener('wallet-currency-mode-change', handleModeChange);
    return () => window.removeEventListener('wallet-currency-mode-change', handleModeChange);
  }, []);

  const cycleWalletDisplayMode = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const nextMode =
      walletDisplayMode === 'USD' ? 'VND' : walletDisplayMode === 'VND' ? 'DUAL' : 'USD';
    setWalletDisplayMode(nextMode);
    try {
      localStorage.setItem('blog_wallet_currency_mode', nextMode);
      window.dispatchEvent(new Event('wallet-currency-mode-change'));
    } catch {
      // ignore
    }
  };

  // Logout State & Handler
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsLoggingOut(true);
    try {
      await signOut({ callbackUrl: '/' });
    } catch {
      try {
        if (signOutAction) {
          await signOutAction();
        } else {
          window.location.href = '/';
        }
      } catch {
        window.location.href = '/';
      }
    }
  };

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, startChangePassword] = useTransition();
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Copy License Key State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Đồng bộ tab khi URL thay đổi
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: string, shouldScroll = false) => {
    setActiveTab(tab);
    router.replace(`/account?tab=${tab}`, { scroll: false });
    if (shouldScroll) {
      setTimeout(() => {
        const el = document.getElementById('account-tab-content');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage({
        type: 'error',
        text: 'Kích thước tệp vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.',
      });
      return;
    }

    setIsUploadingAvatar(true);
    setProfileMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadAvatar(formData);
      if (res.success && res.url) {
        setImageUrl(res.url);
        setProfileMessage({ type: 'success', text: res.message || 'Tải ảnh đại diện thành công!' });
      } else {
        setProfileMessage({ type: 'error', text: res.error || 'Tải ảnh lên thất bại.' });
      }
    } catch {
      setProfileMessage({ type: 'error', text: 'Đã xảy ra lỗi khi tải ảnh lên.' });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', imageUrl);
    formData.append('age', age);
    formData.append('address', address);
    formData.append('education', education);
    formData.append('bio', bio);

    startUpdateProfile(async () => {
      const res = await updateProfile(formData);
      if (res.success) {
        setProfileMessage({
          type: 'success',
          text: res.message || 'Cập nhật thông tin hồ sơ thành công!',
        });
      } else {
        setProfileMessage({ type: 'error', text: res.error || 'Có lỗi xảy ra.' });
      }
    });
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setWalletMessage(null);

    const numAmount = parseFloat(depositAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setWalletMessage({ type: 'error', text: 'Vui lòng nhập số tiền hợp lệ.' });
      return;
    }

    startDeposit(async () => {
      if (depositMethod === 'PAYOS') {
        const res = await createDepositPaymentLink(selectedCurrency, numAmount);
        if (res.success && res.orderCode) {
          setQrDepositData(res);
          setShowQrModal(true);
        } else {
          setWalletMessage({ type: 'error', text: res.error || 'Không thể tạo phiên thanh toán.' });
        }
      } else if (depositMethod === 'INSTANT') {
        const res = await instantDepositWallet(selectedCurrency, numAmount);
        if (res.success) {
          setWalletMessage({ type: 'success', text: res.message || 'Nạp tiền thành công!' });
          router.refresh();
        } else {
          setWalletMessage({ type: 'error', text: res.error || 'Nạp tiền thất bại.' });
        }
      }
    });
  };

  const handleQrDepositSuccess = (newBalanceVnd?: number, newBalanceUsd?: number) => {
    setWalletMessage({ type: 'success', text: 'Nạp tiền vào ví qua VietQR thành công!' });
    if (newBalanceVnd !== undefined || newBalanceUsd !== undefined) {
      window.dispatchEvent(
        new CustomEvent('wallet-balance-updated', {
          detail: { balanceVnd: newBalanceVnd, balanceUsd: newBalanceUsd },
        }),
      );
    }
    router.refresh();
  };

  const handleExchange = (e: React.FormEvent) => {
    e.preventDefault();
    setExchangeMessage(null);

    const numAmount = parseFloat(exchangeAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setExchangeMessage({
        type: 'error',
        text: 'Vui lòng nhập số tiền hợp lệ lớn hơn 0 để quy đổi.',
      });
      return;
    }

    startExchange(async () => {
      const res = await exchangeWalletCurrency(exchangeDirection, numAmount);
      if (res.success) {
        setExchangeMessage({ type: 'success', text: res.message || 'Quy đổi tiền tệ thành công!' });
        router.refresh();
      } else {
        setExchangeMessage({ type: 'error', text: res.error || 'Quy đổi tiền tệ thất bại.' });
      }
    });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawMessage(null);

    if (user.role !== 'ADMIN') {
      setWithdrawMessage({
        type: 'error',
        text: 'Tính năng rút tiền về tài khoản ngân hàng hiện chỉ dành riêng cho Quản trị viên (Admin).',
      });
      return;
    }

    const numAmount = parseFloat(withdrawAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setWithdrawMessage({ type: 'error', text: 'Vui lòng nhập số tiền rút hợp lệ.' });
      return;
    }

    const finalBankName =
      withdrawBankName === 'Ngân hàng khác' ? customBankName.trim() : withdrawBankName.trim();

    if (!finalBankName) {
      setWithdrawMessage({
        type: 'error',
        text: 'Vui lòng chọn hoặc nhập tên ngân hàng thụ hưởng.',
      });
      return;
    }

    if (!withdrawAccountNumber.trim()) {
      setWithdrawMessage({
        type: 'error',
        text: 'Vui lòng nhập số tài khoản ngân hàng nhận tiền.',
      });
      return;
    }

    if (!withdrawAccountName.trim()) {
      setWithdrawMessage({ type: 'error', text: 'Vui lòng nhập tên chủ tài khoản thụ hưởng.' });
      return;
    }

    startWithdraw(async () => {
      const res = await withdrawWalletFunds({
        currency: withdrawCurrency,
        amount: numAmount,
        bankName: finalBankName,
        accountNumber: withdrawAccountNumber.trim(),
        accountName: withdrawAccountName.trim(),
        note: withdrawNote.trim() || undefined,
      });

      if (res.success) {
        setWithdrawMessage({ type: 'success', text: res.message || 'Rút tiền thành công!' });
        setWithdrawAmount('');
        if (res.newBalanceVnd !== undefined || res.newBalanceUsd !== undefined) {
          window.dispatchEvent(
            new CustomEvent('wallet-balance-updated', {
              detail: { balanceVnd: res.newBalanceVnd, balanceUsd: res.newBalanceUsd },
            }),
          );
        }
        router.refresh();
      } else {
        setWithdrawMessage({ type: 'error', text: res.error || 'Rút tiền thất bại.' });
      }
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    const formData = new FormData();
    formData.append('currentPassword', currentPassword);
    formData.append('newPassword', newPassword);
    formData.append('confirmPassword', confirmPassword);

    startChangePassword(async () => {
      const res = await changePassword(formData);
      if (res.success) {
        setPasswordMessage({ type: 'success', text: res.message || 'Đổi mật khẩu thành công!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: res.error || 'Có lỗi xảy ra.' });
      }
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* 1. HERO PROFILE CARD */}
      <div className="bg-card border-border relative overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8">
        <div
          className="bg-primary/5 pointer-events-none absolute -top-12 -right-12 z-0 size-64 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Avatar container */}
            <div className="group relative">
              <div className="border-border/80 bg-muted/60 relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 text-2xl font-bold shadow-md sm:size-24">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={name || user.email}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <span className="text-primary font-mono">
                    {(name || user.email).charAt(0).toUpperCase()}
                  </span>
                )}
                {/* Nút bấm tải ảnh nhanh khi hover */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  title="Tải ảnh đại diện mới từ máy tính"
                >
                  <Camera className="mb-0.5 size-5" />
                  <span className="text-[10px] font-semibold">Tải ảnh</span>
                </button>
              </div>
              {pro && (
                <div
                  className="absolute -right-1.5 -bottom-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-md"
                  title="Thành viên PRO"
                >
                  <Crown className="size-3.5" />
                </div>
              )}
            </div>

            {/* Thông tin tên, email, vai trò */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-foreground text-xl font-extrabold sm:text-2xl">
                  {name || user.email.split('@')[0]}
                </h2>
                {pro ? (
                  <Badge className="bg-amber-500 font-bold text-white shadow-2xs hover:bg-amber-500">
                    <Crown className="mr-1 size-3" /> PRO
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Miễn phí
                  </Badge>
                )}
                {user.role === 'ADMIN' && (
                  <Badge className="bg-rose-600 text-xs font-bold text-white hover:bg-rose-700">
                    <ShieldCheck className="mr-1 size-3" /> Quản trị viên
                  </Badge>
                )}
              </div>

              <p className="text-muted-foreground text-sm font-medium">{user.email}</p>

              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  Tham gia từ {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                </span>
                {age && (
                  <span className="text-foreground flex items-center gap-1 font-medium">
                    <User className="text-muted-foreground size-3.5" />
                    {age} tuổi
                  </span>
                )}
                {address && (
                  <span className="text-foreground flex items-center gap-1 font-medium">
                    <MapPin className="text-muted-foreground size-3.5" />
                    {address}
                  </span>
                )}
                {education && (
                  <span className="text-foreground flex items-center gap-1 font-medium">
                    <GraduationCap className="text-muted-foreground size-3.5" />
                    {education}
                  </span>
                )}
                {pro && user.proUntil && (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    <Clock className="size-3.5" />
                    Hết hạn: {new Date(user.proUntil).toLocaleDateString('vi-VN')} ({daysLeft} ngày)
                  </span>
                )}
              </div>

              {bio && (
                <p className="text-muted-foreground line-clamp-2 pt-1 text-xs italic">
                  &ldquo;{bio}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="relative z-20 flex flex-wrap items-center gap-2.5 sm:flex-col sm:items-end">
            {user.role === 'ADMIN' && (
              <Link
                href="/admin/entry"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Settings className="size-3.5" /> Trang quản trị Admin
              </Link>
            )}

            <div className="inline-flex items-center rounded-xl border border-emerald-500/40 bg-emerald-500/5 text-emerald-600 shadow-xs dark:text-emerald-400">
              <button
                type="button"
                onClick={() => handleTabChange('wallet', true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-l-xl px-3 py-2 text-xs font-bold transition hover:bg-emerald-500/10"
                title="Nhấn để mở khu vực Quản lý Ví và Nạp/Quy đổi tiền"
              >
                <Wallet className="size-4 shrink-0" />
                <span>
                  {walletDisplayMode === 'USD'
                    ? `$${totalInUsd.toFixed(2)} (≈ ${totalInVnd.toLocaleString('vi-VN')} đ)`
                    : walletDisplayMode === 'VND'
                      ? `${totalInVnd.toLocaleString('vi-VN')} đ (≈ $${totalInUsd.toFixed(2)})`
                      : `$${wallet.balanceUsd.toFixed(2)} | ${wallet.balanceVnd.toLocaleString('vi-VN')} đ`}
                </span>
              </button>
              <button
                type="button"
                onClick={cycleWalletDisplayMode}
                className="flex cursor-pointer items-center gap-1 rounded-r-xl border-l border-emerald-500/30 px-2 py-2 font-mono text-[11px] font-bold transition hover:bg-emerald-500/10"
                title="Nhấn để xoay tua hiển thị giữa USD và VND"
                aria-label="Xoay tua đơn vị tiền tệ"
              >
                <span className="opacity-80">{walletDisplayMode}</span>
                <RefreshCw className="size-3" />
              </button>
            </div>

            {!pro ? (
              <Button
                type="button"
                onClick={() => setProModalOpen(true)}
                className="cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-white shadow-md hover:from-amber-600 hover:to-amber-700"
              >
                <Crown className="mr-1.5 size-4" /> Nâng cấp PRO
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setProModalOpen(true)}
                variant="outline"
                className="cursor-pointer border-amber-500/40 font-bold text-amber-600 shadow-xs hover:bg-amber-500/10 dark:text-amber-400"
              >
                <Sparkles className="mr-1.5 size-4" /> Gia hạn PRO
              </Button>
            )}

            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleSignOut}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-600 shadow-2xs transition hover:border-rose-500/60 hover:bg-rose-500/20 disabled:opacity-50 sm:w-auto dark:text-rose-400 dark:hover:bg-rose-500/20"
              title="Đăng xuất khỏi tài khoản"
            >
              {isLoggingOut ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <LogOut className="size-3.5" />
              )}
              <span>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
            </button>
          </div>
        </div>

        {/* 5 Thống kê nhanh (bao gồm Ví số dư VND & USD) */}
        <div className="border-border/60 relative z-10 mt-6 grid grid-cols-2 gap-3 border-t pt-6 sm:grid-cols-5 sm:gap-4">
          <button
            type="button"
            onClick={() => handleTabChange('wallet', true)}
            className="hover:bg-muted/50 group col-span-2 cursor-pointer rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-left transition sm:col-span-1"
            title="Nhấn để mở khu vực Quản lý Ví và Nạp/Quy đổi tiền"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1">
                <Wallet className="size-3.5" /> Ví số dư
              </span>
              <span
                onClick={cycleWalletDisplayMode}
                className="text-muted-foreground flex items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[10px] font-medium transition hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                title="Nhấn để xoay tua hiển thị giữa USD và VND"
              >
                <span>{walletDisplayMode}</span>
                <RefreshCw className="size-2.5" />
              </span>
            </div>
            <div className="text-foreground mt-0.5 truncate text-base font-extrabold sm:text-lg">
              {walletDisplayMode === 'USD'
                ? `$${totalInUsd.toFixed(2)} USD`
                : `${totalInVnd.toLocaleString('vi-VN')} đ`}
            </div>
            <div className="text-muted-foreground truncate text-[11px] font-medium">
              {walletDisplayMode === 'USD'
                ? `≈ ${totalInVnd.toLocaleString('vi-VN')} đ`
                : `≈ $${totalInUsd.toFixed(2)} USD`}
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('orders', true)}
            className="hover:bg-muted/50 cursor-pointer rounded-xl p-2.5 text-left transition"
          >
            <div className="text-muted-foreground text-xs">Đơn hàng</div>
            <div className="text-foreground mt-0.5 text-xl font-extrabold sm:text-2xl">
              {orders.length}
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('orders', true)}
            className="hover:bg-muted/50 cursor-pointer rounded-xl p-2.5 text-left transition"
          >
            <div className="text-muted-foreground text-xs">Phần mềm / Key</div>
            <div className="text-foreground mt-0.5 text-xl font-extrabold sm:text-2xl">
              {licenses.length}
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('vouchers', true)}
            className="hover:bg-muted/50 cursor-pointer rounded-xl p-2.5 text-left transition"
          >
            <div className="text-muted-foreground text-xs">Mã giảm giá</div>
            <div className="text-foreground mt-0.5 text-xl font-extrabold sm:text-2xl">
              {grants.filter((g) => !g.usedAt).length}
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('posts', true)}
            className="hover:bg-muted/50 cursor-pointer rounded-xl p-2.5 text-left transition"
          >
            <div className="text-muted-foreground text-xs">Bài cộng đồng</div>
            <div className="text-foreground mt-0.5 text-xl font-extrabold sm:text-2xl">
              {posts.length}
            </div>
          </button>
        </div>
      </div>

      {/* 2. TAB NAVIGATION */}
      <div
        id="account-tab-content"
        className="border-border/80 flex scroll-mt-20 flex-wrap items-center gap-1 border-b pb-1 sm:gap-1.5"
      >
        <button
          type="button"
          onClick={() => handleTabChange('profile')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all sm:px-3 sm:text-sm',
            activeTab === 'profile'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <User className="size-3.5 sm:size-4" />
          Hồ sơ
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('wallet')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all sm:px-3 sm:text-sm',
            activeTab === 'wallet'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Wallet className="size-3.5 sm:size-4" />
          Ví tiền
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('pro')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all sm:px-3 sm:text-sm',
            activeTab === 'pro'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Crown className="size-3.5 text-amber-400 sm:size-4" />
          Gói PRO
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('orders')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all sm:px-3 sm:text-sm',
            activeTab === 'orders'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Package className="size-3.5 sm:size-4" />
          Đơn hàng ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('vouchers')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all sm:px-3 sm:text-sm',
            activeTab === 'vouchers'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Ticket className="size-3.5 sm:size-4" />
          Voucher ({grants.filter((g) => !g.usedAt).length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('posts')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all sm:px-3 sm:text-sm',
            activeTab === 'posts'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <FileText className="size-3.5 sm:size-4" />
          Bài viết ({posts.length})
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: THÔNG TIN HỒ SƠ & MẬT KHẨU */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Admin shortcut banner (chỉ hiển thị với Quản trị viên) */}
          {user.role === 'ADMIN' && (
            <div className="border-border bg-card relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-600 font-bold text-white hover:bg-rose-700">
                      <ShieldCheck className="mr-1 size-3" /> QUẢN TRỊ VIÊN ADMIN
                    </Badge>
                    <h3 className="text-foreground text-base font-bold">
                      Khu vực quản trị hệ thống
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Tài khoản của bạn được cấp đặc quyền Quản trị (Admin). Truy cập Bảng điều khiển
                    để quản lý sản phẩm, đơn hàng, duyệt bài viết cộng đồng, mã giảm giá và cài đặt
                    hệ thống.
                  </p>
                </div>
                <Link
                  href="/admin/entry"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <Settings className="size-4" />
                  Đến Trang Quản Trị Admin →
                </Link>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Form Chỉnh sửa thông tin */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="text-primary size-5" />
                  Chỉnh sửa thông tin cá nhân
                </CardTitle>
                <CardDescription>
                  Cập nhật họ tên, ảnh đại diện, tuổi tác, địa chỉ và học vấn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  {/* Input ẩn để chọn file ảnh từ máy */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarFileUpload}
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    className="hidden"
                  />

                  {profileMessage && (
                    <div
                      className={cn(
                        'rounded-lg p-3 text-xs font-medium',
                        profileMessage.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {profileMessage.text}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="email"
                      className="text-muted-foreground mb-1 block text-xs font-semibold"
                    >
                      Địa chỉ Email (Định danh)
                    </label>
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      Email đăng nhập và nhận thông tin đơn hàng không thể thay đổi.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="name"
                      className="text-muted-foreground mb-1 block text-xs font-semibold"
                    >
                      Họ và tên hiển thị <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="VD: Toàn Nguyễn"
                      maxLength={80}
                    />
                  </div>

                  {/* Tuổi tác & Học vấn */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="age"
                        className="text-muted-foreground mb-1 block text-xs font-semibold"
                      >
                        Tuổi tác
                      </label>
                      <Input
                        id="age"
                        type="number"
                        min={1}
                        max={120}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="VD: 25"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="education"
                        className="text-muted-foreground mb-1 block text-xs font-semibold"
                      >
                        Trình độ học vấn
                      </label>
                      <Input
                        id="education"
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        placeholder="VD: Kỹ sư CNTT, Cử nhân..."
                        maxLength={120}
                      />
                    </div>
                  </div>

                  {/* Địa chỉ ở hiện tại */}
                  <div>
                    <label
                      htmlFor="address"
                      className="text-muted-foreground mb-1 block text-xs font-semibold"
                    >
                      Địa chỉ ở hiện tại
                    </label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="VD: Cầu Giấy, Hà Nội, Việt Nam"
                      maxLength={200}
                    />
                  </div>

                  {/* Giới thiệu bản thân (Bio) */}
                  <div>
                    <label
                      htmlFor="bio"
                      className="text-muted-foreground mb-1 block text-xs font-semibold"
                    >
                      Giới thiệu bản thân (Bio)
                    </label>
                    <textarea
                      id="bio"
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Chia sẻ ngắn gọn về kỹ năng, kinh nghiệm hoặc sở thích công nghệ của bạn..."
                      maxLength={500}
                      className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  {/* Ảnh đại diện & Tải lên */}
                  <div className="border-border/60 border-t pt-3">
                    <label className="text-muted-foreground mb-1.5 block text-xs font-semibold">
                      Ảnh đại diện (Avatar)
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="cursor-pointer"
                      >
                        {isUploadingAvatar ? (
                          <>
                            <Loader2 className="text-primary mr-1.5 size-4 animate-spin" />
                            Đang tải ảnh lên...
                          </>
                        ) : (
                          <>
                            <Upload className="text-primary mr-1.5 size-4" />
                            Tải ảnh từ máy tính
                          </>
                        )}
                      </Button>
                      <span className="text-muted-foreground text-[11px]">
                        Hỗ trợ PNG, JPG, WebP, GIF, AVIF (tối đa 5MB)
                      </span>
                    </div>

                    <div className="mt-3">
                      <label
                        htmlFor="avatar-url"
                        className="text-muted-foreground mb-1 block text-[11px]"
                      >
                        Hoặc nhập đường dẫn URL ảnh:
                      </label>
                      <Input
                        id="avatar-url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://... hoặc /images/..."
                      />
                    </div>

                    <div className="mt-2.5">
                      <span className="text-muted-foreground block text-[11px]">
                        Hoặc chọn ảnh đại diện mẫu:
                      </span>
                      <div className="mt-1.5 flex items-center gap-2">
                        {AVATAR_PRESETS.map((preset, idx) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setImageUrl(preset)}
                            className={cn(
                              'relative size-8 overflow-hidden rounded-full border-2 transition',
                              imageUrl === preset
                                ? 'border-primary ring-primary/30 ring-2'
                                : 'border-border opacity-70 hover:opacity-100',
                            )}
                          >
                            <Image
                              src={preset}
                              alt={`Preset ${idx + 1}`}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          </button>
                        ))}
                        {imageUrl && (
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="text-muted-foreground hover:text-foreground text-[11px] underline"
                          >
                            Xóa ảnh
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={isUpdatingProfile} className="w-full sm:w-auto">
                      <Save className="mr-1.5 size-4" />
                      {isUpdatingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Form Đổi mật khẩu */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="text-primary size-5" />
                  {user.hasPassword ? 'Đổi mật khẩu tài khoản' : 'Tạo mật khẩu đăng nhập'}
                </CardTitle>
                <CardDescription>
                  {user.hasPassword
                    ? 'Bảo vệ tài khoản bằng mật khẩu an toàn tối thiểu 6 ký tự'
                    : 'Tài khoản của bạn đăng ký qua Google/GitHub. Bạn có thể đặt mật khẩu để đăng nhập bằng email.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passwordMessage && (
                    <div
                      className={cn(
                        'rounded-lg p-3 text-xs font-medium',
                        passwordMessage.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {passwordMessage.text}
                    </div>
                  )}

                  {user.hasPassword && (
                    <div>
                      <label
                        htmlFor="current-pwd"
                        className="text-muted-foreground mb-1 block text-xs font-semibold"
                      >
                        Mật khẩu hiện tại <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          id="current-pwd"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          placeholder="Nhập mật khẩu đang dùng"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="new-pwd"
                      className="text-muted-foreground mb-1 block text-xs font-semibold"
                    >
                      Mật khẩu mới (Tối thiểu 6 ký tự) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        id="new-pwd"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Nhập mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                      >
                        {showNewPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-pwd"
                      className="text-muted-foreground mb-1 block text-xs font-semibold"
                    >
                      Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      id="confirm-pwd"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      className="w-full sm:w-auto"
                    >
                      <Key className="mr-1.5 size-4" />
                      {isChangingPassword
                        ? 'Đang cập nhật...'
                        : user.hasPassword
                          ? 'Cập nhật mật khẩu'
                          : 'Thiết lập mật khẩu'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Cảnh báo vi phạm (nếu có) */}
            {warnings.length > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm md:col-span-2">
                <div className="flex items-center gap-2 font-bold text-red-600">
                  <ShieldAlert className="size-5" />
                  Cảnh báo tài khoản ({warnings.length}/{WARNING_LIMIT})
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Bạn đã nhận {warnings.length}/{WARNING_LIMIT} cảnh báo từ quản trị viên. Khi đạt
                  đủ {WARNING_LIMIT} cảnh báo, tài khoản sẽ bị tự động khóa vĩnh viễn.
                </p>
                <ul className="text-muted-foreground mt-3 list-disc space-y-1 pl-5 text-xs">
                  {warnings.map((w) => (
                    <li key={w.id}>
                      {new Date(w.createdAt).toLocaleDateString('vi-VN')}:{' '}
                      <span className="text-foreground font-medium">{w.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: VÍ TIỀN & NẠP TIỀN (VND & USD) */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {/* Thông báo thanh toán (nếu vừa quay lại từ PayOS sau khi nạp tiền) */}
          {orderCode && searchParams.get('status') === 'success' && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                Giao dịch nạp tiền thành công! (Mã giao dịch: {orderCode})
              </div>
              <p className="mt-1 text-xs">
                Khoản nạp đã được ghi nhận và cộng trực tiếp vào số dư ví của bạn.
              </p>
            </div>
          )}

          {cancelled && (
            <div className="text-muted-foreground rounded-xl border border-dashed p-4 text-xs">
              Bạn đã hủy phiên nạp tiền PayOS. Bạn có thể thực hiện lại bất cứ lúc nào bên dưới.
            </div>
          )}

          {/* 2 THẺ SỐ DƯ VÍ: VND & USD */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Card 1: Ví VND */}
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600/10 via-emerald-500/5 to-transparent p-6 shadow-sm">
              <div className="pointer-events-none absolute -right-6 -bottom-6 size-32 rounded-full bg-emerald-500/10 blur-2xl" />
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇻🇳</span>
                    <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Ví Việt Nam Đồng (VND)
                    </span>
                  </div>
                  <div className="text-foreground mt-3 text-3xl font-black sm:text-4xl">
                    {wallet.balanceVnd.toLocaleString('vi-VN')}{' '}
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      đ
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Quy đổi tương đương:{' '}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ≈ ${(wallet.balanceVnd / USD_TO_VND_RATE).toFixed(2)} USD
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                  <Coins className="size-6" />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedCurrency('VND');
                    setDepositMethod('PAYOS');
                    setDepositAmount('100000');
                    document
                      .getElementById('deposit-section')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <QrCode className="mr-1.5 size-3.5" /> Nạp VND qua VietQR
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setExchangeDirection('VND_TO_USD');
                    setExchangeAmount(wallet.balanceVnd > 0 ? String(wallet.balanceVnd) : '100000');
                    document
                      .getElementById('exchange-section')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="border-emerald-500/30 text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                >
                  <RefreshCw className="mr-1.5 size-3.5" /> Đổi sang USD
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setWithdrawCurrency('VND');
                    document
                      .getElementById('withdraw-section')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="border-amber-500/30 text-xs font-bold text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                >
                  <Landmark className="mr-1.5 size-3.5" /> Rút tiền VND
                </Button>
                <span className="text-muted-foreground text-[11px]">Tự động qua VietQR 24/7</span>
              </div>
            </div>

            {/* Card 2: Ví USD */}
            <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/10 via-blue-500/5 to-transparent p-6 shadow-sm">
              <div className="pointer-events-none absolute -right-6 -bottom-6 size-32 rounded-full bg-blue-500/10 blur-2xl" />
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇺🇸</span>
                    <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Ví Đô la Mỹ (USD)
                    </span>
                  </div>
                  <div className="text-foreground mt-3 text-3xl font-black sm:text-4xl">
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">$</span>{' '}
                    {wallet.balanceUsd.toFixed(2)}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Quy đổi tương đương:{' '}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      ≈ {(wallet.balanceUsd * USD_TO_VND_RATE).toLocaleString('vi-VN')} đ
                    </span>{' '}
                    (1 USD = {USD_TO_VND_RATE.toLocaleString('vi-VN')} VND)
                  </p>
                </div>
                <div className="rounded-xl bg-blue-500/10 p-3 text-blue-600 dark:text-blue-400">
                  <CircleDollarSign className="size-6" />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedCurrency('USD');
                    setDepositMethod('PAYOS');
                    setDepositAmount('10');
                    document
                      .getElementById('deposit-section')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <QrCode className="mr-1.5 size-3.5" /> Nạp USD qua VietQR
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setExchangeDirection('USD_TO_VND');
                    setExchangeAmount(wallet.balanceUsd > 0 ? String(wallet.balanceUsd) : '10');
                    document
                      .getElementById('exchange-section')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="border-blue-500/30 text-xs font-bold text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                >
                  <RefreshCw className="mr-1.5 size-3.5" /> Đổi sang VND
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setWithdrawCurrency('USD');
                    document
                      .getElementById('withdraw-section')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="border-amber-500/30 text-xs font-bold text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                >
                  <Landmark className="mr-1.5 size-3.5" /> Rút tiền USD
                </Button>
                <span className="text-muted-foreground text-[11px]">Tỷ giá: 1$ = 25.972đ</span>
              </div>
            </div>
          </div>

          {/* CÔNG CỤ QUY ĐỔI TIỀN TỆ TRỰC TIẾP USD ⇄ VND */}
          <div id="exchange-section">
            <Card className="via-primary/5 border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 to-transparent shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <RefreshCw className="size-5 text-indigo-600 dark:text-indigo-400" />
                      Quy đổi tiền tệ trực tiếp (USD ⇄ VND)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Chuyển đổi số dư tức thì giữa Đô la Mỹ và Việt Nam Đồng theo tỷ giá cố định 1
                      USD = {USD_TO_VND_RATE.toLocaleString('vi-VN')} VND
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="w-fit border-indigo-500/40 font-mono text-xs text-indigo-600 dark:text-indigo-400"
                  >
                    Tỷ giá: 1 USD = {USD_TO_VND_RATE.toLocaleString('vi-VN')} VND
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleExchange} className="space-y-4">
                  {exchangeMessage && (
                    <div
                      className={cn(
                        'rounded-lg p-3 text-xs font-medium',
                        exchangeMessage.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {exchangeMessage.text}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-[1fr,auto,1fr] sm:items-center">
                    {/* Cột nguồn (From) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-semibold">
                          Quy đổi từ ({exchangeDirection === 'USD_TO_VND' ? 'USD' : 'VND'})
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          Khả dụng:{' '}
                          {exchangeDirection === 'USD_TO_VND'
                            ? `$${wallet.balanceUsd.toFixed(2)}`
                            : `${wallet.balanceVnd.toLocaleString('vi-VN')} đ`}
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          min={exchangeDirection === 'USD_TO_VND' ? 0.01 : 1000}
                          step={exchangeDirection === 'USD_TO_VND' ? 0.01 : 1000}
                          value={exchangeAmount}
                          onChange={(e) => setExchangeAmount(e.target.value)}
                          placeholder="Nhập số tiền..."
                          className="pr-16 font-bold"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (exchangeDirection === 'USD_TO_VND') {
                              setExchangeAmount(String(wallet.balanceUsd));
                            } else {
                              setExchangeAmount(String(wallet.balanceVnd));
                            }
                          }}
                          className="bg-muted text-primary hover:bg-muted/80 absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 py-0.5 text-[10px] font-bold transition"
                        >
                          Tối đa
                        </button>
                      </div>
                    </div>

                    {/* Nút đảo chiều */}
                    <div className="flex justify-center pt-2 sm:pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const nextDirection =
                            exchangeDirection === 'USD_TO_VND' ? 'VND_TO_USD' : 'USD_TO_VND';
                          setExchangeDirection(nextDirection);
                          setExchangeAmount(nextDirection === 'USD_TO_VND' ? '10' : '100000');
                          setExchangeMessage(null);
                        }}
                        className="size-10 rounded-full border-indigo-500/30 text-indigo-600 transition hover:scale-105 hover:bg-indigo-500/10 dark:text-indigo-400"
                        title="Đảo chiều quy đổi"
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                    </div>

                    {/* Cột nhận về (To) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-semibold">
                          Nhận về ({exchangeDirection === 'USD_TO_VND' ? 'VND' : 'USD'})
                        </span>
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          (Miễn phí chuyển đổi)
                        </span>
                      </div>
                      <div className="border-input bg-muted/30 text-foreground flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-extrabold">
                        <span>
                          {exchangeDirection === 'USD_TO_VND'
                            ? `${Math.round((parseFloat(exchangeAmount) || 0) * USD_TO_VND_RATE).toLocaleString('vi-VN')} đ`
                            : `$${((parseFloat(exchangeAmount) || 0) / USD_TO_VND_RATE).toFixed(2)} USD`}
                        </span>
                        <Badge className="border-none bg-indigo-500/10 text-[10px] text-indigo-600 dark:text-indigo-400">
                          {exchangeDirection === 'USD_TO_VND' ? 'VND' : 'USD'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-muted-foreground text-[11px]">
                      💡 Số dư sẽ được cập nhật ngay lập tức vào ví tài khoản của bạn.
                    </div>
                    <Button
                      type="submit"
                      disabled={isExchanging}
                      className="bg-indigo-600 font-bold text-white shadow-sm hover:bg-indigo-700"
                    >
                      {isExchanging ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Đang quy đổi...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-1.5 size-4" />
                          Xác nhận quy đổi{' '}
                          {exchangeDirection === 'USD_TO_VND' ? 'USD ➔ VND' : 'VND ➔ USD'}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* KHU VỰC FORM NẠP TIỀN */}
          <div id="deposit-section" className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="text-primary size-5" />
                  Nạp tiền vào tài khoản
                </CardTitle>
                <CardDescription>
                  Chọn loại tiền tệ (VND / USD), số tiền và phương thức nạp tiền bạn mong muốn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDeposit} className="space-y-5">
                  {walletMessage && (
                    <div
                      className={cn(
                        'rounded-lg p-3 text-xs font-medium',
                        walletMessage.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {walletMessage.text}
                    </div>
                  )}

                  {/* Chọn loại tiền tệ */}
                  <div>
                    <label className="text-muted-foreground mb-1.5 block text-xs font-semibold">
                      1. Chọn loại ví nạp tiền
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCurrency('VND');
                          setDepositAmount('100000');
                        }}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition',
                          selectedCurrency === 'VND'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 ring-2 ring-emerald-500/20 dark:text-emerald-300'
                            : 'border-border text-muted-foreground hover:bg-muted',
                        )}
                      >
                        <span className="text-base">🇻🇳</span>
                        <span>Việt Nam Đồng (VND)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCurrency('USD');
                          setDepositAmount('10');
                        }}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition',
                          selectedCurrency === 'USD'
                            ? 'border-blue-500 bg-blue-500/10 text-blue-700 ring-2 ring-blue-500/20 dark:text-blue-300'
                            : 'border-border text-muted-foreground hover:bg-muted',
                        )}
                      >
                        <span className="text-base">🇺🇸</span>
                        <span>Đô la Mỹ (USD)</span>
                      </button>
                    </div>
                  </div>

                  {/* Chọn số tiền nạp */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-muted-foreground text-xs font-semibold">
                        2. Chọn số tiền nạp ({selectedCurrency})
                      </label>
                      {selectedCurrency === 'USD' && (
                        <span className="text-muted-foreground text-[11px] font-medium">
                          ≈{' '}
                          {(parseFloat(depositAmount || '0') * USD_TO_VND_RATE).toLocaleString(
                            'vi-VN',
                          )}{' '}
                          đ
                        </span>
                      )}
                    </div>

                    {/* Mệnh giá nạp nhanh */}
                    <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {(selectedCurrency === 'VND'
                        ? [50000, 100000, 200000, 500000, 1000000, 2000000]
                        : [5, 10, 20, 50, 100, 200]
                      ).map((amt) => {
                        const isSelected = depositAmount === String(amt);
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setDepositAmount(String(amt))}
                            className={cn(
                              'rounded-lg border px-2 py-2 text-center text-xs font-bold transition',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                                : 'border-border text-foreground hover:bg-muted',
                            )}
                          >
                            {selectedCurrency === 'VND'
                              ? `${(amt / 1000).toLocaleString('vi-VN')}k`
                              : `$${amt}`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative">
                      <Input
                        type="number"
                        min={selectedCurrency === 'VND' ? 10000 : 1}
                        max={selectedCurrency === 'VND' ? 50000000 : 2000}
                        step={selectedCurrency === 'VND' ? 1000 : 1}
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder={selectedCurrency === 'VND' ? 'VD: 100000' : 'VD: 10'}
                        className="pr-16 text-base font-bold"
                        required
                      />
                      <div className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold uppercase">
                        {selectedCurrency}
                      </div>
                    </div>
                  </div>

                  {/* Chọn phương thức thanh toán */}
                  <div>
                    <label className="text-muted-foreground mb-1.5 block text-xs font-semibold">
                      3. Phương thức nạp tiền
                    </label>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setDepositMethod('PAYOS')}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border p-3.5 text-left transition',
                          depositMethod === 'PAYOS'
                            ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                            : 'border-border hover:bg-muted',
                        )}
                      >
                        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                          <QrCode className="size-5" />
                        </div>
                        <div>
                          <div className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                            Quét mã VietQR (Tự động 24/7)
                            <Badge className="bg-emerald-500 text-[10px] text-white">
                              Khuyên dùng
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            Hiện mã VietQR trên màn hình, quét bằng app ngân hàng bất kỳ là tiền vào
                            ví tự động ngay.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDepositMethod('INSTANT')}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border p-3.5 text-left transition',
                          depositMethod === 'INSTANT'
                            ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20'
                            : 'border-border hover:bg-muted',
                        )}
                      >
                        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                          <Zap className="size-5" />
                        </div>
                        <div>
                          <div className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                            Nạp nhanh thử nghiệm
                            <Badge variant="secondary" className="text-[10px]">
                              Test / Demo
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            Cộng số dư trực tiếp vào ví lập tức để thử nghiệm tính năng mua hàng.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isDepositing}
                      className={cn(
                        'w-full font-bold text-white shadow-md sm:w-auto',
                        selectedCurrency === 'VND'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-blue-600 hover:bg-blue-700',
                      )}
                    >
                      {isDepositing ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          {depositMethod === 'PAYOS'
                            ? 'Đang tạo mã VietQR...'
                            : 'Đang xử lý nạp tiền...'}
                        </>
                      ) : depositMethod === 'PAYOS' ? (
                        <>
                          <QrCode className="mr-1.5 size-4" />
                          Tạo mã VietQR nạp{' '}
                          {selectedCurrency === 'USD'
                            ? `$${depositAmount}`
                            : `${parseInt(depositAmount || '0').toLocaleString('vi-VN')} đ`}
                        </>
                      ) : (
                        <>
                          <Zap className="mr-1.5 size-4" />
                          Nạp nhanh{' '}
                          {selectedCurrency === 'USD'
                            ? `$${depositAmount}`
                            : `${parseInt(depositAmount || '0').toLocaleString('vi-VN')} đ`}{' '}
                          vào ví
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Cột hướng dẫn & Thông tin chuyển khoản */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-1.5 text-sm font-bold">
                    <Building2 className="text-primary size-4" />
                    Chuyển khoản thủ công (Dự phòng)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="bg-muted/50 space-y-1.5 rounded-xl p-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ngân hàng:</span>
                      <span className="text-foreground font-bold">MB Bank / Vietcombank</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số tài khoản:</span>
                      <span className="text-primary font-mono font-bold">0987654321</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chủ tài khoản:</span>
                      <span className="text-foreground font-semibold uppercase">
                        NGUYEN VAN TOAN
                      </span>
                    </div>
                    <div className="border-border/60 flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">Cú pháp nạp:</span>
                      <code className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono font-bold text-rose-500">
                        NAP {user.id.slice(-6).toUpperCase()}
                      </code>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    💡 Sau khi chuyển khoản với đúng nội dung, hệ thống sẽ tự động duyệt hoặc admin
                    sẽ kiểm tra và cộng tiền trong tối đa 15 phút.
                  </p>
                </CardContent>
              </Card>

              <div className="bg-card border-border/80 space-y-2 rounded-2xl border p-4 text-xs">
                <div className="text-foreground flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  Quyền lợi khi nạp ví
                </div>
                <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-[11px]">
                  <li>Thanh toán mua Source Code & Tài nguyên chỉ với 1 click.</li>
                  <li>Không lo bị gián đoạn khi ngân hàng bảo trì.</li>
                  <li>Hỗ trợ giữ cả số dư VND và USD linh hoạt.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* KHU VỰC RÚT TIỀN VỀ NGÂN HÀNG (CHỈ DÀNH RIÊNG CHO QUẢN TRỊ VIÊN - ADMIN) */}
          <div id="withdraw-section">
            {user.role === 'ADMIN' ? (
              <Card className="via-card border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-transparent shadow-sm">
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Landmark className="size-5 text-amber-600 dark:text-amber-400" />
                        Rút tiền về tài khoản ngân hàng
                      </CardTitle>
                      <CardDescription>
                        Quyết toán số dư ví về tài khoản ngân hàng thụ hưởng (Đặc quyền Quản trị
                        viên)
                      </CardDescription>
                    </div>
                    <Badge className="w-fit border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-700 dark:text-amber-400">
                      Quyền Admin
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleWithdraw} className="space-y-5">
                    {withdrawMessage && (
                      <div
                        className={cn(
                          'rounded-lg p-3 text-xs font-medium',
                          withdrawMessage.type === 'success'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                        )}
                      >
                        {withdrawMessage.text}
                      </div>
                    )}

                    {/* 1. Chọn loại ví rút */}
                    <div>
                      <label className="text-muted-foreground mb-1.5 block text-xs font-semibold">
                        1. Chọn loại ví rút tiền
                      </label>
                      <div className="grid max-w-md grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setWithdrawCurrency('VND');
                            setWithdrawAmount('');
                          }}
                          className={cn(
                            'flex items-center justify-between rounded-xl border p-3 text-xs font-semibold transition sm:text-sm',
                            withdrawCurrency === 'VND'
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 ring-2 ring-emerald-500/20 dark:text-emerald-300'
                              : 'border-border text-muted-foreground hover:bg-muted',
                          )}
                        >
                          <span>🇻🇳 Ví VND</span>
                          <span className="font-mono text-xs font-bold">
                            {wallet.balanceVnd.toLocaleString('vi-VN')} đ
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWithdrawCurrency('USD');
                            setWithdrawAmount('');
                          }}
                          className={cn(
                            'flex items-center justify-between rounded-xl border p-3 text-xs font-semibold transition sm:text-sm',
                            withdrawCurrency === 'USD'
                              ? 'border-blue-500 bg-blue-500/10 text-blue-700 ring-2 ring-blue-500/20 dark:text-blue-300'
                              : 'border-border text-muted-foreground hover:bg-muted',
                          )}
                        >
                          <span>🇺🇸 Ví USD</span>
                          <span className="font-mono text-xs font-bold">
                            ${wallet.balanceUsd.toFixed(2)}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Số tiền rút */}
                    <div>
                      <div className="mb-1.5 flex max-w-md items-center justify-between">
                        <label className="text-muted-foreground text-xs font-semibold">
                          2. Số tiền muốn rút
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setWithdrawAmount(
                              withdrawCurrency === 'VND'
                                ? String(wallet.balanceVnd)
                                : String(wallet.balanceUsd),
                            );
                          }}
                          className="text-primary text-[11px] font-bold hover:underline"
                        >
                          Rút tất cả (
                          {withdrawCurrency === 'VND'
                            ? `${wallet.balanceVnd.toLocaleString('vi-VN')} đ`
                            : `$${wallet.balanceUsd.toFixed(2)}`}
                          )
                        </button>
                      </div>
                      <div className="relative max-w-md">
                        <Input
                          type="number"
                          min={withdrawCurrency === 'VND' ? 10000 : 1}
                          max={withdrawCurrency === 'VND' ? wallet.balanceVnd : wallet.balanceUsd}
                          step={withdrawCurrency === 'VND' ? 1000 : 0.01}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder={withdrawCurrency === 'VND' ? 'VD: 500000' : 'VD: 50'}
                          className="pr-16 text-base font-bold"
                          required
                        />
                        <div className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold uppercase">
                          {withdrawCurrency}
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        Hạn mức rút: Tối thiểu {withdrawCurrency === 'VND' ? '10.000 đ' : '$1'}, tối
                        đa không vượt quá số dư khả dụng.
                      </p>
                    </div>

                    {/* 3. Thông tin ngân hàng nhận */}
                    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-muted-foreground mb-1.5 block text-xs font-semibold">
                          3. Ngân hàng nhận tiền
                        </label>
                        <select
                          value={withdrawBankName}
                          onChange={(e) => setWithdrawBankName(e.target.value)}
                          className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-2 text-xs font-semibold shadow-xs focus:ring-1 focus:outline-none"
                        >
                          {POPULAR_BANKS.map((bank) => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                        {withdrawBankName === 'Ngân hàng khác' && (
                          <Input
                            type="text"
                            placeholder="Nhập tên ngân hàng nhận tiền"
                            value={customBankName}
                            onChange={(e) => setCustomBankName(e.target.value)}
                            className="mt-2 text-xs"
                            required
                          />
                        )}
                      </div>

                      <div>
                        <label className="text-muted-foreground mb-1.5 block text-xs font-semibold">
                          Số tài khoản ngân hàng
                        </label>
                        <Input
                          type="text"
                          placeholder="VD: 0359876543"
                          value={withdrawAccountNumber}
                          onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                          className="font-mono text-xs font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-muted-foreground mb-1.5 block text-xs font-semibold">
                          Tên chủ tài khoản (viết hoa không dấu)
                        </label>
                        <Input
                          type="text"
                          placeholder="VD: NGUYEN VAN A"
                          value={withdrawAccountName}
                          onChange={(e) => setWithdrawAccountName(e.target.value.toUpperCase())}
                          className="font-mono text-xs font-bold uppercase"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-muted-foreground mb-1.5 block text-xs font-semibold">
                          Ghi chú rút tiền (tùy chọn)
                        </label>
                        <Input
                          type="text"
                          placeholder="VD: Quyết toán tháng 9"
                          value={withdrawNote}
                          onChange={(e) => setWithdrawNote(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    {/* Bảng tóm tắt lệnh rút tiền */}
                    {parseFloat(withdrawAmount) > 0 && (
                      <div className="bg-muted/50 border-border/80 max-w-md space-y-2 rounded-xl border p-4 text-xs">
                        <div className="text-foreground border-border/60 flex items-center gap-1.5 border-b pb-1 font-bold">
                          <ShieldCheck className="size-4 text-emerald-500" />
                          Tóm tắt lệnh rút tiền
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Số dư hiện tại:</span>
                          <span className="font-mono font-semibold">
                            {withdrawCurrency === 'VND'
                              ? `${wallet.balanceVnd.toLocaleString('vi-VN')} đ`
                              : `$${wallet.balanceUsd.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold text-rose-600 dark:text-rose-400">
                          <span>Số tiền rút:</span>
                          <span className="font-mono font-bold">
                            -
                            {withdrawCurrency === 'VND'
                              ? `${Math.round(parseFloat(withdrawAmount) || 0).toLocaleString('vi-VN')} đ`
                              : `$${parseFloat(withdrawAmount).toFixed(2)}`}
                          </span>
                        </div>
                        <div className="border-border/60 flex justify-between border-t pt-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <span>Số dư còn lại:</span>
                          <span className="font-mono">
                            {withdrawCurrency === 'VND'
                              ? `${Math.max(0, wallet.balanceVnd - Math.round(parseFloat(withdrawAmount) || 0)).toLocaleString('vi-VN')} đ`
                              : `$${Math.max(0, wallet.balanceUsd - (parseFloat(withdrawAmount) || 0)).toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={isWithdrawing}
                        className="bg-amber-600 font-bold text-white shadow-md hover:bg-amber-700"
                      >
                        {isWithdrawing ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Đang xử lý rút tiền...
                          </>
                        ) : (
                          <>
                            <Landmark className="mr-1.5 size-4" />
                            Xác nhận rút tiền về tài khoản
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/80 bg-muted/20">
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                        <Lock className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          Rút tiền về tài khoản ngân hàng
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-400"
                          >
                            Dành riêng cho Admin
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Tính năng rút tiền về tài khoản ngân hàng hiện tạm thời chưa mở cho tài
                          khoản thành viên
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-background space-y-2 rounded-xl border border-dashed border-amber-500/30 p-4 text-xs">
                    <p className="text-foreground leading-relaxed font-medium">
                      Hiện tại tính năng rút tiền trực tiếp về tài khoản ngân hàng chỉ áp dụng cho
                      tài khoản <strong>Quản trị viên (Admin)</strong> để quyết toán doanh thu.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Số dư trong ví của bạn được bảo lưu an toàn 100% và có thể sử dụng bất cứ lúc
                      nào để thanh toán mua tài liệu mã nguồn, khóa học hoặc nâng cấp gói PRO trên
                      hệ thống.
                    </p>
                  </div>
                  <Button
                    disabled
                    variant="outline"
                    className="cursor-not-allowed text-xs font-semibold opacity-60"
                  >
                    <Lock className="mr-1.5 size-3.5" />
                    Rút tiền về ngân hàng (Yêu cầu tài khoản Admin)
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* BẢNG LỊCH SỬ BIẾN ĐỘNG SỐ DƯ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="text-primary size-5" />
                Lịch sử biến động số dư ({wallet.transactions.length})
              </CardTitle>
              <CardDescription>
                Theo dõi toàn bộ các lần nạp tiền và thanh toán bằng số dư tài khoản
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wallet.transactions.length === 0 ? (
                <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                  Bạn chưa có giao dịch nạp tiền hoặc chi tiêu nào từ ví.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground border-border border-b text-[11px] font-semibold uppercase">
                      <tr>
                        <th className="px-4 py-3">Thời gian</th>
                        <th className="px-4 py-3">Mã GD</th>
                        <th className="px-4 py-3">Nội dung</th>
                        <th className="px-4 py-3">Số tiền</th>
                        <th className="px-4 py-3">Số dư sau GD</th>
                        <th className="px-4 py-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {wallet.transactions.map((tx) => {
                        const isDeposit = tx.type === 'DEPOSIT';
                        const isUsd = tx.currency === 'USD';
                        return (
                          <tr key={tx.id} className="hover:bg-muted/30 transition">
                            <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleString('vi-VN')}
                            </td>
                            <td className="text-foreground px-4 py-3 font-mono font-semibold whitespace-nowrap">
                              {tx.orderCode || tx.id.slice(0, 8)}
                            </td>
                            <td className="text-foreground px-4 py-3 font-medium">
                              {tx.description ||
                                (isDeposit ? 'Nạp tiền vào ví' : 'Thanh toán đơn hàng')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={cn(
                                  'font-bold',
                                  isDeposit
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-500',
                                )}
                              >
                                {isDeposit ? '+' : '-'}{' '}
                                {isUsd
                                  ? `$${tx.amount.toFixed(2)}`
                                  : `${Math.round(tx.amount).toLocaleString('vi-VN')} đ`}
                              </span>
                            </td>
                            <td className="text-muted-foreground px-4 py-3 font-mono whitespace-nowrap">
                              {isUsd
                                ? `$${tx.balanceAfter.toFixed(2)}`
                                : `${Math.round(tx.balanceAfter).toLocaleString('vi-VN')} đ`}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {tx.status === 'COMPLETED' ? 'Thành công' : tx.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: NÂNG CẤP PRO & ĐẶC QUYỀN */}
      {activeTab === 'pro' && (
        <div className="space-y-8">
          {/* Thông báo thanh toán (nếu vừa quay lại từ PayOS) */}
          {orderCode && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                Giao dịch nâng cấp PRO thành công! (Mã đơn: {orderCode})
              </div>
              <p className="mt-1 text-xs">
                Cảm ơn bạn đã nâng cấp tài khoản PRO! Hệ thống đã ghi nhận và tự động gia hạn thời
                gian sử dụng dịch vụ.
              </p>
            </div>
          )}

          {cancelled && (
            <div className="text-muted-foreground rounded-xl border border-dashed p-4 text-xs">
              Bạn đã hủy phiên thanh toán. Bạn có thể chọn lại gói bất cứ lúc nào bên dưới.
            </div>
          )}

          {/* Banner trạng thái hiện tại */}
          <div className="bg-card relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Crown className="size-5 text-amber-500" />
                  <h3 className="text-lg font-bold">
                    Trạng thái:{' '}
                    {pro
                      ? 'Tài khoản PRO đang hoạt động'
                      : 'Tài khoản Miễn phí (Chưa kích hoạt PRO)'}
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  {pro && user.proUntil
                    ? `Hạn dùng đến hết ngày ${new Date(user.proUntil).toLocaleDateString('vi-VN')} (còn ${daysLeft} ngày). Mua thêm sẽ tự động cộng dồn ngày.`
                    : 'Nâng cấp lên gói PRO để mở khóa toàn bộ đặc quyền viết bài, miễn phí ship và nhận voucher bí mật.'}
                </p>
              </div>

              {pro && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-4 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Sparkles className="size-4" /> Còn {daysLeft} ngày bản quyền
                </div>
              )}
            </div>
          </div>

          {/* 2 Gói thẻ PRO */}
          <div className="grid gap-6 md:grid-cols-2">
            {PLAN_ORDER.map((key) => {
              const plan = PRO_PLANS[key];
              const highlight = key === 'PRO_YEAR';
              return (
                <div
                  key={key}
                  className={cn(
                    'bg-card flex flex-col justify-between rounded-2xl border p-6 shadow-sm transition-all sm:p-8',
                    highlight
                      ? 'border-amber-500 ring-2 shadow-amber-500/10 ring-amber-500/30'
                      : 'border-border',
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">{plan.label}</span>
                      {highlight && (
                        <Badge className="bg-amber-500 font-bold text-white shadow-xs hover:bg-amber-500">
                          Khuyên dùng (Tiết kiệm 25%)
                        </Badge>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black sm:text-4xl">
                          {plan.priceVnd.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-muted-foreground text-sm font-semibold">
                          / {plan.days} ngày
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">{plan.hint}</p>
                    </div>

                    <div className="border-border/60 border-t pt-4">
                      <span className="text-muted-foreground block text-xs font-semibold uppercase">
                        Đặc quyền bao gồm:
                      </span>
                      <ul className="mt-2.5 space-y-2 text-xs sm:text-sm">
                        {PRO_BENEFITS.map((benefit) => (
                          <li key={benefit} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6">
                    <BuyProButton
                      plan={key}
                      highlight={highlight}
                      label={pro ? `Gia hạn ${plan.label}` : `Nâng cấp ${plan.label}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bảng chi tiết 5 đặc quyền PRO */}
          <div className="bg-muted/30 border-border/80 rounded-2xl border p-6">
            <h4 className="flex items-center gap-2 text-base font-bold">
              <Zap className="size-4 text-amber-500" />
              Tổng hợp quyền lợi đặc quyền của thành viên PRO
            </h4>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-card border-border/60 rounded-xl border p-4">
                <PenLine className="text-primary mb-2 size-5" />
                <h5 className="text-sm font-semibold">Đăng bài viết chia sẻ</h5>
                <p className="text-muted-foreground mt-1 text-xs">
                  Tự do xuất bản bài viết kiến thức, hướng dẫn thực chiến lên cộng đồng sau khi được
                  duyệt.
                </p>
              </div>

              <div className="bg-card border-border/60 rounded-xl border p-4">
                <Truck className="mb-2 size-5 text-emerald-500" />
                <h5 className="text-sm font-semibold">Luôn Miễn Phí Vận Chuyển</h5>
                <p className="text-muted-foreground mt-1 text-xs">
                  Không lo phí ship khi đặt mua các sản phẩm vật lý tại Shop dltoan07 trên toàn
                  quốc.
                </p>
              </div>

              <div className="bg-card border-border/60 rounded-xl border p-4">
                <Gift className="mb-2 size-5 text-rose-500" />
                <h5 className="text-sm font-semibold">Voucher & Quà tặng bí mật</h5>
                <p className="text-muted-foreground mt-1 text-xs">
                  Được gửi tặng các voucher giảm giá sâu độc quyền và tham gia các mini game riêng
                  cho Pro.
                </p>
              </div>

              <div className="bg-card border-border/60 rounded-xl border p-4">
                <Crown className="mb-2 size-5 text-amber-500" />
                <h5 className="text-sm font-semibold">Huy hiệu Vàng nổi bật</h5>
                <p className="text-muted-foreground mt-1 text-xs">
                  Hiển thị badge PRO vàng kim bên cạnh tên tài khoản khi bình luận và trao đổi trên
                  toàn hệ thống.
                </p>
              </div>

              <div className="bg-card border-border/60 rounded-xl border p-4 sm:col-span-2 lg:col-span-2">
                <MessageCircle className="mb-2 size-5 text-blue-500" />
                <h5 className="text-sm font-semibold">Kênh hỗ trợ ưu tiên 1-1</h5>
                <p className="text-muted-foreground mt-1 text-xs">
                  Được ưu tiên giải đáp các thắc mắc về mã nguồn, cấu hình máy chủ VPS, Docker và
                  triển khai dự án.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ĐƠN HÀNG & BẢN QUYỀN */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Bản quyền phần mềm */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="text-primary size-5" />
                Khoá bản quyền & Tệp tải về ({licenses.length})
              </CardTitle>
              <CardDescription>
                Danh sách license phần mềm đã mua kèm mã bản quyền và liên kết tải file bảo mật.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {licenses.length === 0 ? (
                <div className="border-border text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                  Bạn chưa sở hữu phần mềm hoặc khóa bản quyền nào.
                  <div className="mt-2">
                    <Link
                      href={siteConfig.shopPath}
                      className="text-primary font-medium hover:underline"
                    >
                      Xem các sản phẩm tại Shop →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="divide-border divide-y">
                  {licenses.map((lic) => {
                    const remaining = Math.max(0, lic.maxDownloads - lic.downloadCount);
                    return (
                      <div key={lic.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-foreground font-semibold">{lic.product.name}</h4>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">Mã bản quyền:</span>
                              <code className="bg-muted text-foreground rounded px-2 py-0.5 font-mono text-xs font-bold">
                                {lic.key}
                              </code>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(lic.key, lic.id)}
                                className="text-muted-foreground hover:text-foreground"
                                title="Sao chép mã"
                              >
                                {copiedKey === lic.id ? (
                                  <Check className="size-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <Badge variant={remaining > 0 ? 'default' : 'secondary'}>
                            Còn {remaining}/{lic.maxDownloads} lượt tải
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Phiên bản: {lic.product.version}
                          </span>
                          <Link
                            href={`/api/download/${lic.id}`}
                            className={buttonStyles({
                              variant: 'outline',
                              size: 'sm',
                              className: 'h-8 text-xs',
                            })}
                          >
                            <Download className="mr-1.5 size-3.5" /> Tải file (.zip)
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lịch sử đơn hàng */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="text-primary size-5" />
                Lịch sử đơn hàng ({orders.length})
              </CardTitle>
              <CardDescription>
                Nhật ký giao dịch và trạng thái thanh toán các đơn hàng
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  Chưa có đơn hàng nào.
                </p>
              ) : (
                <div className="divide-border divide-y text-sm">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/account/orders/${order.id}`}
                      className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg p-3 transition"
                    >
                      <div>
                        <div className="font-mono font-bold hover:underline">{order.orderCode}</div>
                        <div className="text-muted-foreground mt-0.5 text-xs">
                          {new Date(order.createdAt).toLocaleDateString('vi-VN')} &bull; Cổng:{' '}
                          {order.provider}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-primary font-bold">
                          {order.totalVnd.toLocaleString('vi-VN')} đ
                        </div>
                        <Badge
                          variant={paymentStatusBadgeVariant(order.status)}
                          className="mt-1 text-xs"
                        >
                          {paymentStatusLabel(order.status)}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: MÃ GIẢM GIÁ (VOUCHERS) */}
      {activeTab === 'vouchers' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ticket className="text-primary size-5" />
              Mã giảm giá cá nhân ({grants.filter((g) => !g.usedAt).length})
            </CardTitle>
            <CardDescription>
              Các mã voucher độc quyền được cấp riêng cho tài khoản của bạn để áp dụng khi thanh
              toán Shop.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {grants.length === 0 ? (
              <div className="border-border text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                Bạn chưa có mã giảm giá cá nhân nào.
                <p className="mt-1 text-xs">
                  Thành viên PRO sẽ được nhận mã giảm giá và voucher định kỳ.
                </p>
              </div>
            ) : (
              <div className="divide-border divide-y text-sm">
                {grants.map((grant) => {
                  const status = grant.usedAt
                    ? { label: 'Đã dùng', tone: 'muted' as const }
                    : voucherStatus(grant.coupon);
                  return (
                    <div
                      key={grant.id}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-3 py-3.5',
                        status.tone === 'muted' && 'opacity-60',
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="bg-primary/10 text-primary border-primary/20 rounded border px-2 py-0.5 font-mono text-sm font-bold">
                            {grant.code}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(grant.code, grant.id)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Sao chép mã"
                          >
                            {copiedKey === grant.id ? (
                              <Check className="size-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {describeVoucher(grant.coupon)} &bull;{' '}
                          {grant.coupon.scope === 'ALL'
                            ? 'Áp dụng toàn Shop'
                            : grant.coupon.categories
                                .map((c: { name: string }) => c.name)
                                .join(', ')}
                          {grant.coupon.endsAt &&
                            ` &bull; Hạn đến ${new Date(grant.coupon.endsAt).toLocaleDateString('vi-VN')}`}
                        </p>
                      </div>

                      <Badge
                        variant={status.tone === 'active' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {status.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: BÀI VIẾT CỦA TÔI */}
      {activeTab === 'posts' && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="text-primary size-5" />
                  Bài viết cộng đồng của tôi ({posts.length})
                </CardTitle>
                <CardDescription>
                  Quản lý các bài viết bạn đã đăng tải lên cộng đồng
                </CardDescription>
              </div>

              {pro || user.role === 'ADMIN' ? (
                <Link href="/account/posts/new" className={buttonStyles({ size: 'sm' })}>
                  <PenLine className="mr-1.5 size-4" /> Viết bài mới
                </Link>
              ) : (
                <Button onClick={() => handleTabChange('pro')} size="sm" variant="outline">
                  <Crown className="mr-1.5 size-4 text-amber-500" /> Nâng cấp PRO để viết bài
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <div className="border-border text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                Bạn chưa xuất bản bài viết nào.
                {pro ? (
                  <div className="mt-2">
                    <Link
                      href="/account/posts/new"
                      className="text-primary font-medium hover:underline"
                    >
                      Viết bài đầu tiên ngay bây giờ →
                    </Link>
                  </div>
                ) : (
                  <p className="mt-1 text-xs">
                    Hãy nâng cấp PRO để có quyền viết và chia sẻ bài viết lên cộng đồng.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-border divide-y text-sm">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                  >
                    <div>
                      {post.status === 'PUBLISHED' ? (
                        <Link
                          href={`/blog/${post.slug}`}
                          className="text-foreground font-semibold hover:underline"
                        >
                          {post.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground font-semibold line-through">
                          {post.title}
                        </span>
                      )}
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        Ngày đăng: {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                        {post.status === 'REMOVED' && post.removedReason && (
                          <span className="text-rose-500">
                            {' '}
                            &bull; Lý do gỡ: {post.removedReason}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={post.status === 'PUBLISHED' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {post.status === 'PUBLISHED' ? 'Đang hiển thị' : 'Đã bị gỡ'}
                      </Badge>
                      {post.status === 'PUBLISHED' && (pro || user.role === 'ADMIN') && (
                        <Link
                          href={`/account/posts/${post.id}/edit`}
                          className={buttonStyles({
                            size: 'sm',
                            variant: 'outline',
                            className: 'h-7 text-xs',
                          })}
                        >
                          Sửa
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Nâng cấp / Gia hạn PRO trực tiếp khi bấm nút trên đầu */}
      <Dialog
        open={proModalOpen}
        onClose={() => setProModalOpen(false)}
        title={pro ? 'Gia hạn gói tài khoản PRO' : 'Nâng cấp lên tài khoản PRO'}
        description="Chọn gói thời hạn phù hợp để tiếp tục tận hưởng mọi đặc quyền thành viên PRO:"
        className="max-w-lg"
      >
        <div className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Gói 1 tháng */}
            <div className="border-border bg-card flex flex-col justify-between rounded-xl border p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Gói 1 tháng
                  </span>
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold">
                    30 ngày
                  </span>
                </div>
                <div className="text-foreground mt-2 text-xl font-extrabold">20.000 đ</div>
                <div className="text-muted-foreground text-xs">≈ $0.77 USD</div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Đăng bài viết chia sẻ, miễn phí ship trọn gói mọi đơn hàng.
                </p>
              </div>
              <div className="border-border/60 mt-4 border-t pt-2">
                <BuyProButton
                  plan="PRO_MONTH"
                  label={pro ? 'Gia hạn 1 tháng' : 'Nâng cấp 1 tháng'}
                />
              </div>
            </div>

            {/* Gói 1 năm */}
            <div className="relative flex flex-col justify-between rounded-xl border-2 border-amber-500 bg-amber-500/5 p-4 shadow-xs">
              <span className="absolute -top-2.5 right-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                Tiết kiệm 25%
              </span>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                    Gói 1 năm
                  </span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    365 ngày
                  </span>
                </div>
                <div className="mt-2 text-xl font-extrabold text-amber-700 dark:text-amber-400">
                  180.000 đ
                </div>
                <div className="text-muted-foreground text-xs">≈ $6.93 USD</div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Tiết kiệm chi phí tối đa, nhận voucher quà tặng bí mật.
                </p>
              </div>
              <div className="mt-4 border-t border-amber-500/20 pt-2">
                <BuyProButton
                  plan="PRO_YEAR"
                  highlight
                  label={pro ? 'Gia hạn 1 năm' : 'Nâng cấp 1 năm'}
                />
              </div>
            </div>
          </div>

          <div className="border-border/80 bg-muted/30 text-muted-foreground flex items-center justify-between rounded-xl border p-3 text-xs">
            <span>Hỗ trợ: Trừ ví tài khoản (VND/USD) hoặc Quét mã VietQR.</span>
            <button
              type="button"
              onClick={() => {
                setProModalOpen(false);
                handleTabChange('pro', true);
              }}
              className="text-primary ml-2 shrink-0 cursor-pointer font-semibold hover:underline"
            >
              Xem chi tiết quyền lợi →
            </button>
          </div>
        </div>
      </Dialog>

      {/* Modal nạp tiền qua VietQR thời gian thực */}
      <QrDepositModal
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        data={qrDepositData}
        onSuccess={handleQrDepositSuccess}
      />
    </div>
  );
}
