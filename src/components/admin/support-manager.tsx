'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Headset,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Paperclip,
  X,
  User,
  Phone,
  Calendar,
  Loader2,
  ExternalLink,
  Lock,
  Unlock,
} from 'lucide-react';
import { SupportTicketStatus } from '@prisma/client';
import {
  adminGetSupportTickets,
  getTicketDetails,
  adminUpdateTicketStatus,
  adminSendTicketMessage,
} from '@/server/actions/support';
import { cn } from '@/lib/utils';

type TicketWithSnippet = Awaited<ReturnType<typeof adminGetSupportTickets>>[number];
type TicketDetails = NonNullable<Awaited<ReturnType<typeof getTicketDetails>>>;

const STATUS_LABELS: Record<
  SupportTicketStatus,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: 'Chờ tiếp nhận',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: Clock,
  },
  IN_PROGRESS: {
    label: 'Đang xử lý',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: Headset,
  },
  RESOLVED: {
    label: 'Xử lý hoàn tất',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    icon: CheckCircle2,
  },
};

export function SupportManager({ initialTickets }: { initialTickets: TicketWithSnippet[] }) {
  const [tickets, setTickets] = useState<TicketWithSnippet[]>(initialTickets);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialTickets[0]?.id || null,
  );
  const [activeTicket, setActiveTicket] = useState<TicketDetails | null>(null);

  const [filter, setFilter] = useState<SupportTicketStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Chat message & attachment state
  const [adminInput, setAdminInput] = useState('');
  const [adminImage, setAdminImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Image lightbox preview modal
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Tải danh sách đơn
  const fetchTicketsList = useCallback(async () => {
    try {
      const data = await adminGetSupportTickets(filter);
      setTickets(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách ticket:', err);
    }
  }, [filter]);

  // 2. Tải chi tiết đơn đang chọn
  const fetchActiveTicketDetails = useCallback(async (ticketId: string, showLoading = false) => {
    if (showLoading) setLoadingDetails(true);
    try {
      const data = await getTicketDetails(ticketId);
      if (data) {
        setActiveTicket(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết ticket:', err);
    } finally {
      if (showLoading) setLoadingDetails(false);
    }
  }, []);

  // Khi chọn ticket mới
  useEffect(() => {
    if (selectedTicketId) {
      prevMsgCountRef.current = 0;
      fetchActiveTicketDetails(selectedTicketId, true);
    } else {
      setActiveTicket(null);
    }
  }, [selectedTicketId, fetchActiveTicketDetails]);

  // Polling tự động mỗi 3.5s để cập nhật tin nhắn mới & trạng thái đơn
  useEffect(() => {
    const timer = setInterval(() => {
      fetchTicketsList();
      if (selectedTicketId) {
        fetchActiveTicketDetails(selectedTicketId, false);
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [fetchTicketsList, fetchActiveTicketDetails, selectedTicketId]);

  // Cuộn tin nhắn xuống đáy NỘI BỘ khung chat (KHÔNG cuộn toàn bộ trang web của trình duyệt)
  useEffect(() => {
    const count = activeTicket?.messages?.length ?? 0;
    if (count > 0 && count !== prevMsgCountRef.current) {
      prevMsgCountRef.current = count;
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  }, [activeTicket?.messages]);

  // Nút bấm Làm mới thủ công
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchTicketsList();
    if (selectedTicketId) {
      await fetchActiveTicketDetails(selectedTicketId, false);
    }
    setIsRefreshing(false);
  };

  // Upload ảnh đính kèm từ Admin
  const handleAdminUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/support/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setAdminImage(data.url);
      } else {
        setErrorMsg(data.error || 'Lỗi khi tải ảnh.');
      }
    } catch {
      setErrorMsg('Không thể tải ảnh lúc này.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Admin cập nhật trạng thái đơn (Chờ -> Đang xử lý -> Hoàn tất)
  const handleUpdateStatus = async (newStatus: SupportTicketStatus) => {
    if (!selectedTicketId || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    setErrorMsg('');
    try {
      await adminUpdateTicketStatus(selectedTicketId, newStatus);
      await fetchTicketsList();
      await fetchActiveTicketDetails(selectedTicketId, false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi cập nhật trạng thái.';
      setErrorMsg(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Admin gửi tin nhắn chat
  const handleAdminSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!adminInput.trim() && !adminImage) || isSending || !selectedTicketId) return;

    setIsSending(true);
    setErrorMsg('');
    try {
      const res = await adminSendTicketMessage({
        ticketId: selectedTicketId,
        content: adminInput,
        imageUrl: adminImage || undefined,
      });

      if (res.success) {
        setAdminInput('');
        setAdminImage(null);
        await fetchTicketsList();
        await fetchActiveTicketDetails(selectedTicketId, false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi gửi tin nhắn.';
      setErrorMsg(message);
    } finally {
      setIsSending(false);
    }
  };

  // Đếm số lượng ticket theo trạng thái
  const counts = {
    all: tickets.length,
    pending: tickets.filter((t) => t.status === 'PENDING').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
  };

  // Lọc theo search và tab
  const filteredTickets = tickets.filter((t) => {
    const matchesFilter = filter === 'ALL' || t.status === filter;
    const matchesSearch =
      !searchQuery.trim() ||
      (t.guestName && t.guestName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.guestContact && t.guestContact.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Lightbox phóng to ảnh đính kèm */}
      {lightboxUrl && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="bg-card border-border relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl border shadow-2xl">
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-2 text-white transition hover:bg-black"
            >
              <X className="size-5" />
            </button>
            <div className="relative h-full w-full">
              <Image
                src={lightboxUrl}
                alt="Phóng to ảnh"
                width={1200}
                height={800}
                className="max-h-[85vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Header và Thống kê nhanh */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <div className="flex size-9 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-500">
              <Headset className="size-5" />
            </div>
            <span>Trợ giúp & Hỗ trợ khách hàng</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tiếp nhận yêu cầu từ người dùng, mở cổng chat trực tiếp và quản lý tiến trình giải quyết
            vấn đề.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="border-border bg-card text-foreground hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition"
        >
          <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Thẻ thống kê 3 trạng thái */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          onClick={() => setFilter('PENDING')}
          className={cn(
            'flex cursor-pointer items-center justify-between rounded-2xl border p-4 shadow-xs transition',
            filter === 'PENDING'
              ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
              : 'border-border bg-card hover:bg-muted/40',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Chờ tiếp nhận</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {counts.pending}
              </p>
            </div>
          </div>
          {counts.pending > 0 && (
            <span className="flex size-2 animate-ping rounded-full bg-amber-500" />
          )}
        </div>

        <div
          onClick={() => setFilter('IN_PROGRESS')}
          className={cn(
            'flex cursor-pointer items-center justify-between rounded-2xl border p-4 shadow-xs transition',
            filter === 'IN_PROGRESS'
              ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
              : 'border-border bg-card hover:bg-muted/40',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Headset className="size-5" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Đang xử lý (Đã kết nối)</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {counts.inProgress}
              </p>
            </div>
          </div>
          {counts.inProgress > 0 && <span className="size-2 rounded-full bg-emerald-500" />}
        </div>

        <div
          onClick={() => setFilter('RESOLVED')}
          className={cn(
            'flex cursor-pointer items-center justify-between rounded-2xl border p-4 shadow-xs transition',
            filter === 'RESOLVED'
              ? 'border-slate-500 bg-slate-500/10 ring-2 ring-slate-500/20'
              : 'border-border bg-card hover:bg-muted/40',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Xử lý hoàn tất (Đã đóng)</p>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                {counts.resolved}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMsg && (
        <div className="border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border p-3 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Khung giao diện chính: Danh sách đơn bên trái - Khung Chat bên phải */}
      <div className="grid min-h-[680px] grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ============================================================
            CỘT TRÁI: BỘ LỌC VÀ DANH SÁCH ĐƠN HỖ TRỢ (col-span-5)
            ============================================================ */}
        <div className="border-border bg-card flex h-[740px] flex-col overflow-hidden rounded-2xl border shadow-xs lg:col-span-5">
          {/* Ô tìm kiếm & Bộ lọc Tab */}
          <div className="border-border bg-muted/20 space-y-3 border-b p-3.5">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
              <input
                type="text"
                placeholder="Tìm theo tên khách, SĐT, email, mã đơn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-xl border py-1.5 pr-3 pl-9 text-xs focus:ring-2 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground absolute top-2 right-2.5"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Các tab trạng thái */}
            <div className="flex scrollbar-none items-center gap-1 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-medium whitespace-nowrap transition',
                  filter === 'ALL'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                Tất cả ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setFilter('PENDING')}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium whitespace-nowrap transition',
                  filter === 'PENDING'
                    ? 'bg-amber-600 font-semibold text-white shadow-2xs'
                    : 'text-amber-600 hover:bg-amber-500/10 dark:text-amber-400',
                )}
              >
                <span>Chờ duyệt</span>
                {counts.pending > 0 && (
                  <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-900">
                    {counts.pending}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilter('IN_PROGRESS')}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-medium whitespace-nowrap transition',
                  filter === 'IN_PROGRESS'
                    ? 'bg-emerald-600 font-semibold text-white shadow-2xs'
                    : 'text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400',
                )}
              >
                Đang xử lý ({counts.inProgress})
              </button>
              <button
                type="button"
                onClick={() => setFilter('RESOLVED')}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-medium whitespace-nowrap transition',
                  filter === 'RESOLVED'
                    ? 'bg-slate-700 font-semibold text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-500/10 dark:text-slate-400',
                )}
              >
                Đã xong ({counts.resolved})
              </button>
            </div>
          </div>

          {/* Danh sách ticket cuộn dọc */}
          <div className="divide-border flex-1 divide-y overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <div className="text-muted-foreground space-y-2 p-8 text-center">
                <MessageSquare className="mx-auto size-8 stroke-1 opacity-50" />
                <p className="text-xs">Không có yêu cầu hỗ trợ nào khớp.</p>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = selectedTicketId === t.id;
                const statusMeta = STATUS_LABELS[t.status];
                const StatusIcon = statusMeta.icon;
                const latestMsg = t.messages[0];

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={cn(
                      'hover:bg-muted/40 relative flex cursor-pointer flex-col gap-2 p-3.5 transition',
                      isSelected && 'bg-primary/5 border-l-primary border-l-4',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground truncate text-xs font-semibold">
                            {t.guestName || 'Khách truy cập'}
                          </span>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            #{t.id.slice(-5)}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                          {t.guestContact || 'Chưa để lại liên hệ'}
                        </p>
                      </div>

                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                          statusMeta.badgeClass,
                        )}
                      >
                        <StatusIcon className="size-3" />
                        <span>{statusMeta.label}</span>
                      </span>
                    </div>

                    <div className="text-foreground line-clamp-1 text-xs font-medium">
                      {t.subject}
                    </div>

                    {latestMsg && (
                      <div className="text-muted-foreground bg-muted/30 line-clamp-1 flex items-center justify-between rounded-lg px-2 py-1 text-xs">
                        <span className="truncate">
                          <strong className="text-foreground/80">{latestMsg.senderName}:</strong>{' '}
                          {latestMsg.content}
                        </span>
                        {latestMsg.imageUrl && (
                          <span className="ml-1 shrink-0 text-[10px] font-semibold text-emerald-600">
                            [Ảnh]
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-muted-foreground flex items-center justify-between pt-1 text-[10px]">
                      <span>{new Date(t.updatedAt).toLocaleString('vi-VN')}</span>
                      <span>{t._count.messages} tin nhắn</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================
            CỘT PHẢI: KHUNG CHI TIẾT ĐƠN & LIVE CHAT VỚI KHÁCH HÀNG (col-span-7)
            ============================================================ */}
        <div className="border-border bg-card flex h-[740px] flex-col overflow-hidden rounded-2xl border shadow-xs lg:col-span-7">
          {loadingDetails ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2">
              <Loader2 className="text-primary size-6 animate-spin" />
              <p className="text-xs">Đang tải chi tiết đơn hỗ trợ...</p>
            </div>
          ) : !activeTicket ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center space-y-3 p-8 text-center">
              <div className="bg-muted/60 text-muted-foreground flex size-16 items-center justify-center rounded-full">
                <Headset className="size-8" />
              </div>
              <div>
                <h3 className="text-foreground text-sm font-bold">Chưa chọn đơn hỗ trợ</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                  Chọn một yêu cầu ở danh sách bên trái để xem nội dung, hình ảnh đính kèm và chat
                  trực tiếp với khách hàng.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header chi tiết đơn & Nút đổi trạng thái */}
              <div className="border-border bg-muted/20 space-y-3 border-b p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold',
                          STATUS_LABELS[activeTicket.status].badgeClass,
                        )}
                      >
                        {(() => {
                          const Icon = STATUS_LABELS[activeTicket.status].icon;
                          return <Icon className="size-3.5" />;
                        })()}
                        <span>{STATUS_LABELS[activeTicket.status].label}</span>
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        #{activeTicket.id}
                      </span>
                    </div>
                    <h2 className="text-foreground mt-1 text-base leading-snug font-bold">
                      {activeTicket.subject}
                    </h2>
                  </div>

                  {/* CỤM NÚT CHUYỂN ĐỔI TRẠNG THÁI CỦA ADMIN */}
                  <div className="flex shrink-0 items-center gap-2">
                    {/* TRẠNG THÁI 1: PENDING -> BẤM TIẾP NHẬN & BẮT ĐẦU CHAT */}
                    {activeTicket.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('IN_PROGRESS')}
                        disabled={isUpdatingStatus}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-md transition hover:from-emerald-700 hover:to-teal-700 hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                      >
                        {isUpdatingStatus ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Unlock className="size-3.5" />
                        )}
                        <span>Xác nhận tiếp nhận & Mở chat</span>
                      </button>
                    )}

                    {/* TRẠNG THÁI 2: IN_PROGRESS -> BẤM XỬ LÝ HOÀN TẤT (ĐÓNG CHAT) */}
                    {activeTicket.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('RESOLVED')}
                        disabled={isUpdatingStatus}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 disabled:opacity-50"
                        title="Đánh dấu hoàn tất và đóng cuộc chat"
                      >
                        {isUpdatingStatus ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Lock className="size-3.5" />
                        )}
                        <span>Xử lý hoàn tất (Đóng đoạn chat)</span>
                      </button>
                    )}

                    {/* TRẠNG THÁI 3: RESOLVED -> BẤM MỞ LẠI ĐƠN NẾU CẦN CHAT TIẾP */}
                    {activeTicket.status === 'RESOLVED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('IN_PROGRESS')}
                        disabled={isUpdatingStatus}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                      >
                        {isUpdatingStatus ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Unlock className="size-3.5" />
                        )}
                        <span>Mở lại đoạn chat</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Thông tin khách hàng & Thời gian */}
                <div className="text-muted-foreground border-border/60 grid grid-cols-2 gap-2 border-t pt-1 text-xs sm:grid-cols-3">
                  <div className="flex items-center gap-1.5">
                    <User className="text-foreground/70 size-3.5 shrink-0" />
                    <span className="truncate">
                      Khách:{' '}
                      <strong className="text-foreground">
                        {activeTicket.guestName || 'Khách truy cập'}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="text-foreground/70 size-3.5 shrink-0" />
                    <span className="truncate">
                      Liên hệ:{' '}
                      <strong className="text-foreground">
                        {activeTicket.guestContact || 'Chưa có'}
                      </strong>
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 sm:col-span-1">
                    <Calendar className="text-foreground/70 size-3.5 shrink-0" />
                    <span className="truncate">
                      Gửi lúc: {new Date(activeTicket.createdAt).toLocaleTimeString('vi-VN')}{' '}
                      {new Date(activeTicket.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thông báo trạng thái theo thời gian thực */}
              {activeTicket.status === 'PENDING' && (
                <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 shrink-0 animate-pulse text-amber-600" />
                    <span>
                      Đơn đang ở trạng thái <strong>Chờ tiếp nhận</strong>. Khách hàng chưa thể nhắn
                      tin tiếp cho đến khi bạn xác nhận!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('IN_PROGRESS')}
                    disabled={isUpdatingStatus}
                    className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-amber-700"
                  >
                    Tiếp nhận ngay
                  </button>
                </div>
              )}

              {activeTicket.status === 'RESOLVED' && (
                <div className="border-border flex items-center justify-between gap-2 border-b bg-slate-500/10 p-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-slate-500" />
                    <span>
                      Đơn này đã được <strong>Xử lý hoàn tất</strong> và khóa chat phía khách hàng.
                      Bạn có thể bấm &quot;Mở lại&quot; nếu cần hỗ trợ thêm.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('IN_PROGRESS')}
                    disabled={isUpdatingStatus}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition"
                  >
                    Mở lại đơn chat
                  </button>
                </div>
              )}

              {/* KHUNG NỘI DUNG TIN NHẮN (MESSAGE HISTORY) */}
              <div
                ref={messagesContainerRef}
                className="no-scrollbar bg-muted/15 flex-1 space-y-4 overflow-y-auto p-4 text-xs sm:text-sm"
              >
                {activeTicket.messages.map((msg) => {
                  const isAdmin = msg.senderRole === 'ADMIN';
                  const isSystemNote = msg.senderName === 'Hệ thống hỗ trợ';

                  if (isSystemNote) {
                    return (
                      <div key={msg.id} className="my-3 flex justify-center">
                        <div className="bg-muted/80 border-border text-muted-foreground max-w-md rounded-full border px-3.5 py-1 text-center text-[11px] font-medium shadow-2xs">
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={cn('flex flex-col', isAdmin ? 'items-end' : 'items-start')}
                    >
                      <div className="text-muted-foreground mb-1 flex items-center gap-1.5 px-1 text-[10px]">
                        <span className="text-foreground font-semibold">{msg.senderName}</span>
                        {isAdmin ? (
                          <span className="rounded bg-violet-500/10 px-1 text-[9px] font-bold text-violet-600 dark:text-violet-400">
                            Admin
                          </span>
                        ) : (
                          <span className="bg-muted text-muted-foreground rounded px-1 text-[9px] font-medium">
                            Khách
                          </span>
                        )}
                        <span>·</span>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={cn(
                          'max-w-[85%] space-y-2 rounded-2xl px-4 py-2.5 leading-relaxed shadow-2xs sm:max-w-[75%]',
                          isAdmin
                            ? 'bg-primary text-primary-foreground rounded-br-xs'
                            : 'bg-card border-border text-foreground rounded-bl-xs border',
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* Hình ảnh đính kèm */}
                        {msg.imageUrl && (
                          <div className="relative mt-2 overflow-hidden rounded-xl border border-black/10">
                            <Image
                              src={msg.imageUrl}
                              alt="Ảnh đính kèm"
                              width={320}
                              height={200}
                              onClick={() => setLightboxUrl(msg.imageUrl)}
                              className="max-h-56 w-auto cursor-pointer rounded-lg object-cover transition hover:opacity-90"
                            />
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(msg.imageUrl)}
                              className="absolute right-2 bottom-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-xs transition hover:bg-black/80"
                            >
                              <ExternalLink className="size-3" />
                              <span>Xem ảnh lớn</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* KHU VỰC NHẬP TIN NHẮN PHẢN HỒI CỦA ADMIN */}
              <div className="bg-card border-border space-y-2 border-t p-3.5">
                {/* Ảnh đính kèm chuẩn bị gửi */}
                {adminImage && (
                  <div className="border-border bg-muted relative inline-block rounded-xl border p-1">
                    <Image
                      src={adminImage}
                      alt="Ảnh đính kèm"
                      width={80}
                      height={60}
                      className="max-h-16 w-auto rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setAdminImage(null)}
                      className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-600 p-0.5 text-white shadow-md transition hover:bg-rose-700"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleAdminSendMessage} className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleAdminUploadImage}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage || isSending}
                    className="border-border hover:bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl border transition"
                    title="Đính kèm hình ảnh trả lời"
                  >
                    {uploadingImage ? (
                      <Loader2 className="text-primary size-4 animate-spin" />
                    ) : (
                      <Paperclip className="size-4" />
                    )}
                  </button>

                  <input
                    type="text"
                    placeholder={
                      activeTicket.status === 'RESOLVED'
                        ? 'Đoạn chat đang đóng. Gửi tin nhắn sẽ mở lại đơn chat...'
                        : 'Nhập câu trả lời hoặc hướng dẫn gửi khách hàng...'
                    }
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                    disabled={isSending}
                    className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:ring-primary flex-1 rounded-xl border px-3.5 py-2.5 text-xs focus:ring-2 focus:outline-none sm:text-sm"
                  />

                  <button
                    type="submit"
                    disabled={(!adminInput.trim() && !adminImage) || isSending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-xs transition disabled:opacity-50 sm:text-sm"
                  >
                    {isSending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="size-4" />
                        <span className="hidden sm:inline">Gửi</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Mẹo gợi ý trả lời nhanh cho Admin */}
                <div className="text-muted-foreground flex scrollbar-none items-center gap-1.5 overflow-x-auto pt-1 text-[11px]">
                  <span className="shrink-0 font-semibold">Mẫu nhanh:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAdminInput(
                        'Chào bạn, mình đã tiếp nhận và đang kiểm tra hệ thống giúp bạn.',
                      )
                    }
                    className="bg-muted/60 hover:bg-muted rounded-lg px-2 py-0.5 whitespace-nowrap transition"
                  >
                    Tiếp nhận
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAdminInput(
                        'Bạn vui lòng chụp lại màn hình lỗi chi tiết gửi kèm giúp mình nhé.',
                      )
                    }
                    className="bg-muted/60 hover:bg-muted rounded-lg px-2 py-0.5 whitespace-nowrap transition"
                  >
                    Xin thêm ảnh lỗi
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAdminInput(
                        'Vấn đề đã được cấu hình và xử lý hoàn tất rồi bạn nhé. Cảm ơn bạn!',
                      )
                    }
                    className="bg-muted/60 hover:bg-muted rounded-lg px-2 py-0.5 whitespace-nowrap transition"
                  >
                    Đã xử lý xong
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
