'use client';

import { useState, useEffect, useRef } from 'react';
import { siteConfig } from '@/config/site';
import {
  Headset,
  X,
  Send,
  Sparkles,
  Paperclip,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { createSupportTicket, getTicketDetails, sendTicketMessage } from '@/server/actions/support';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// --- BỘ ICON SVG CHUẨN CÁC MẠNG XÃ HỘI ---
function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="currentColor" aria-hidden="true">
      <path d="M14 2C7.373 2 2 7.039 2 13.256c0 3.541 1.745 6.697 4.475 8.76V26l3.864-2.122c1.16.322 2.392.497 3.661.497 6.627 0 12-5.039 12-11.256S20.627 2 14 2zm1.192 15.195l-3.054-3.259-5.962 3.259 6.558-6.963 3.13 3.259 5.887-3.259-6.559 6.963z" />
    </svg>
  );
}

function ZaloIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
      <path d="M24 4C13.2 4 4.5 12.3 4.5 22.5c0 5.4 2.5 10.3 6.6 13.7L9.5 44l8.3-4.3c1.9.5 4.1.8 6.2.8 10.8 0 19.5-8.3 19.5-18.5S34.8 4 24 4zm4.4 24.3h-8.2c-.7 0-1.2-.5-1.2-1.2v-.8c0-.4.2-.8.5-1.1l5.2-6h-4.6c-.6 0-1.1-.5-1.1-1.1v-.8c0-.6.5-1.1 1.1-1.1h7.8c.7 0 1.2.5 1.2 1.2v.7c0 .4-.2.8-.5 1.1l-5.3 6.1h5.1c.6 0 1.1.5 1.1 1.1v.8c-.1.7-.6 1.2-1.1 1.2z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.87-4.49V8.52a8.27 8.27 0 0 0 4.84 1.56v-3.4a4.85 4.85 0 0 1-.94.01z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Các kênh mạng xã hội xoay vòng định kỳ mỗi 15 giây
const SOCIAL_CHANNELS = [
  {
    id: 'messenger',
    name: 'Messenger',
    label: 'Nhắn tin qua Fanpage',
    tooltip: '💬 Nhắn tin Fanpage Messenger',
    href: 'https://m.me/61595457981196',
    bgColor: 'bg-gradient-to-tr from-[#006AFF] via-[#0084FF] to-[#A824F5]',
    ringColor: 'ring-[#0084FF]/40',
    icon: MessengerIcon,
  },
  {
    id: 'zalo',
    name: 'Zalo',
    label: 'Chat Zalo trực tiếp',
    tooltip: '⚡ Chat Zalo: 0798566374',
    href: `https://zalo.me/${siteConfig.author.phone}`,
    bgColor: 'bg-[#0068FF]',
    ringColor: 'ring-[#0068FF]/40',
    icon: ZaloIcon,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    label: 'Chat qua Telegram Bot',
    tooltip: '✈️ Kênh Telegram @dltoan07_bot',
    href: siteConfig.links.telegram,
    bgColor: 'bg-[#229ED9]',
    ringColor: 'ring-[#229ED9]/40',
    icon: TelegramIcon,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    label: 'Kênh video công nghệ',
    tooltip: '▶️ Đăng ký YouTube @dltoan07',
    href: siteConfig.links.youtube,
    bgColor: 'bg-[#FF0000]',
    ringColor: 'ring-[#FF0000]/40',
    icon: YoutubeIcon,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    label: 'Kênh video ngắn TikTok',
    tooltip: '🎵 Xem video TikTok @dltoan07',
    href: siteConfig.links.tiktok,
    bgColor: 'bg-black text-white dark:bg-neutral-900 border border-neutral-700',
    ringColor: 'ring-neutral-500/40',
    icon: TikTokIcon,
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    label: 'Kênh X @dltoan07',
    tooltip: '𝕏 Kênh X @dltoan07',
    href: siteConfig.links.x,
    bgColor: 'bg-black text-white dark:bg-neutral-900 border border-neutral-700',
    ringColor: 'ring-neutral-500/40',
    icon: XIcon,
  },
];

const STORAGE_TICKET_KEY = 'dltoan_active_support_ticket';

type TicketDetails = NonNullable<Awaited<ReturnType<typeof getTicketDetails>>>;

export function FloatingContactWidget() {
  // Trạng thái kênh hiện tại trong chu kỳ xoay vòng 15 giây
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRotatingAnim, setIsRotatingAnim] = useState(false);

  // Mở popup hộp chat / gửi đơn hỗ trợ
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Quản lý ticket
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<TicketDetails | null>(null);

  // Form tạo đơn mới
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [ticketSubject, setTicketSubject] = useState('Tư vấn cài đặt & tối ưu VPS Linux');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketImage, setTicketImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [formError, setFormError] = useState('');

  // Form nhắn tin bổ sung khi đơn đã được duyệt (IN_PROGRESS)
  const [chatInput, setChatInput] = useState('');
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevChatMsgCountRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Khởi tạo ticket từ localStorage nếu có
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_TICKET_KEY);
    if (savedId) {
      setActiveTicketId(savedId);
    }
  }, []);

  // 2. Tự động đồng bộ và lấy dữ liệu ticket chi tiết (Poller 3s khi mở khung chat)
  useEffect(() => {
    if (!isChatOpen || !activeTicketId) return;

    let isMounted = true;

    const fetchTicket = async () => {
      try {
        const data = await getTicketDetails(activeTicketId);
        if (isMounted && data) {
          setTicketData(data);
        }
      } catch (err) {
        console.warn('Lỗi lấy thông tin ticket:', err);
      }
    };

    fetchTicket();
    const interval = setInterval(fetchTicket, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isChatOpen, activeTicketId]);

  // 3. Hiệu ứng tự động xoay vòng 5 kênh: mỗi 15 giây xoay tiếp rồi hiện cái tiếp theo
  useEffect(() => {
    if (isChatOpen) return;

    const interval = setInterval(() => {
      setIsRotatingAnim(true);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % SOCIAL_CHANNELS.length);
        setIsRotatingAnim(false);
      }, 500);
    }, 15000); // 15 giây xoay vòng 1 lần

    return () => clearInterval(interval);
  }, [isChatOpen]);

  // Cuộn tin nhắn xuống đáy NỘI BỘ khung chat (KHÔNG cuộn toàn bộ trang web)
  useEffect(() => {
    const count = ticketData?.messages?.length ?? 0;
    if (isChatOpen && count > 0 && count !== prevChatMsgCountRef.current) {
      prevChatMsgCountRef.current = count;
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [ticketData?.messages, isChatOpen]);

  // Lắng nghe phím ESC để đóng popup khi đang mở
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isChatOpen) {
        setIsChatOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen]);

  const activeChannel = (SOCIAL_CHANNELS[currentIndex] ?? SOCIAL_CHANNELS[0])!;
  const ActiveIcon = activeChannel.icon;

  // Xử lý upload ảnh
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, isForChat = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setFormError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/support/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.url) {
        if (isForChat) {
          setChatImage(data.url);
        } else {
          setTicketImage(data.url);
        }
      } else {
        setFormError(data.error || 'Lỗi khi tải ảnh lên.');
      }
    } catch {
      setFormError('Không thể kết nối đến máy chủ để tải ảnh.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Gửi đơn hỗ trợ ban đầu (tạo ticket)
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) {
      setFormError('Vui lòng nhập nội dung mô tả vấn đề của bạn.');
      return;
    }

    setIsSubmittingTicket(true);
    setFormError('');

    try {
      const result = await createSupportTicket({
        name: guestName,
        contact: guestContact,
        subject: ticketSubject,
        message: ticketMessage,
        imageUrl: ticketImage || undefined,
      });

      if (result.success && result.ticketId) {
        setActiveTicketId(result.ticketId);
        localStorage.setItem(STORAGE_TICKET_KEY, result.ticketId);
        // Tải ngay thông tin ticket
        const details = await getTicketDetails(result.ticketId);
        setTicketData(details);
      } else {
        setFormError(result.error || 'Có lỗi xảy ra khi gửi đơn hỗ trợ.');
      }
    } catch {
      setFormError('Không thể gửi đơn hỗ trợ lúc này. Vui lòng thử lại.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Gửi tin nhắn vào cuộc chat (khi admin đã xác nhận IN_PROGRESS)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!chatInput.trim() && !chatImage) || isSendingMessage || !activeTicketId) return;

    setIsSendingMessage(true);

    try {
      const result = await sendTicketMessage({
        ticketId: activeTicketId,
        content: chatInput,
        imageUrl: chatImage || undefined,
        senderName: guestName,
      });

      if (result.success) {
        setChatInput('');
        setChatImage(null);
        // Refresh ticket
        const updated = await getTicketDetails(activeTicketId);
        if (updated) setTicketData(updated);
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Tạo đơn mới (xóa ticket hiện tại)
  const handleStartNewTicket = () => {
    if (confirm('Bạn có muốn tạo một yêu cầu hỗ trợ mới?')) {
      setActiveTicketId(null);
      setTicketData(null);
      setTicketMessage('');
      setTicketImage(null);
      localStorage.removeItem(STORAGE_TICKET_KEY);
    }
  };

  return (
    <>
      {/* KHUNG CỬA SỔ POPUP TO HỖ TRỢ & LIVE CHAT VỚI ADMIN - RA GIỮA MÀN HÌNH */}
      {isChatOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs duration-200 sm:p-6">
          {/* Lớp nền mờ click ra ngoài để đóng */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsChatOpen(false)}
            aria-hidden="true"
          />

          <div
            className={cn(
              'border-border bg-card animate-in zoom-in-95 relative flex w-full max-w-[620px] flex-col overflow-hidden rounded-3xl border shadow-2xl duration-200 select-text md:max-w-[680px]',
              activeTicketId ? 'h-[640px] max-h-[90vh]' : 'max-h-[92vh]',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Popup - Thiết kế tối giản, tinh tế, đồng bộ theme */}
            <div className="border-border/80 bg-card/95 flex shrink-0 items-center justify-between border-b px-5 py-3.5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Image
                    src={siteConfig.logo}
                    alt={siteConfig.author.name}
                    width={40}
                    height={40}
                    className="border-border bg-muted rounded-full border object-cover"
                  />
                  <span className="border-card bg-success ring-success/20 absolute right-0 bottom-0 size-2.5 rounded-full border-2 ring-1" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-foreground text-sm font-semibold sm:text-base">
                      Trung tâm Hỗ trợ & Trợ giúp
                    </h3>
                    <span className="border-border/80 bg-muted/60 text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                      <span className="bg-success size-1.5 animate-pulse rounded-full" />
                      24/7
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                    <span>Admin: Hoàng Anh Toàn</span>
                    {siteConfig.author.phone && (
                      <>
                        <span className="text-muted-foreground/40">•</span>
                        <span>{siteConfig.author.phone}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {activeTicketId && (
                  <button
                    type="button"
                    onClick={handleStartNewTicket}
                    className="border-border/80 hover:bg-muted text-foreground flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition active:scale-95"
                    title="Tạo yêu cầu mới"
                  >
                    <PlusCircle className="text-muted-foreground size-3.5" />
                    <span className="hidden sm:inline">Tạo đơn mới</span>
                    <span className="sm:hidden">Đơn mới</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl p-2 transition"
                  aria-label="Đóng khung chat"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* TRƯỜNG HỢP 1: CHƯA CÓ TICKET HOẶC ĐANG TẠO ĐƠN MỚI */}
            {!activeTicketId ? (
              <div className="no-scrollbar bg-background space-y-4 overflow-y-auto p-5 text-xs sm:p-7 sm:text-sm">
                <div className="border-border/80 bg-muted/40 space-y-1.5 rounded-2xl border p-4">
                  <div className="text-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                    <Sparkles className="text-warning size-3.5" />
                    <span>Quy trình hỗ trợ trực tiếp</span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Nhập thông tin vấn đề và tải hình ảnh đính kèm (nếu có). Sau khi gửi, Admin sẽ
                    xác nhận tiếp nhận để mở cổng chat trực tiếp 2 chiều với bạn!
                  </p>
                </div>

                {formError && (
                  <div className="bg-destructive/10 border-destructive/20 text-destructive flex items-center gap-2 rounded-xl border p-3 text-xs">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-foreground text-xs font-semibold">Họ và tên:</label>
                      <input
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="border-border/80 bg-muted/40 text-foreground focus:ring-primary w-full rounded-xl border px-3.5 py-2.5 text-xs focus:ring-2 focus:outline-none sm:text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-foreground text-xs font-semibold">
                        SĐT / Zalo / Email:
                      </label>
                      <input
                        type="text"
                        placeholder="0798566374 hoặc email"
                        value={guestContact}
                        onChange={(e) => setGuestContact(e.target.value)}
                        className="border-border/80 bg-muted/40 text-foreground focus:ring-primary w-full rounded-xl border px-3.5 py-2.5 text-xs focus:ring-2 focus:outline-none sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-foreground text-xs font-semibold">
                      Chủ đề cần trợ giúp:
                    </label>
                    <select
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="border-border/80 bg-muted/40 text-foreground focus:ring-primary w-full rounded-xl border px-3.5 py-2.5 text-xs focus:ring-2 focus:outline-none sm:text-sm"
                    >
                      <option value="Tư vấn cài đặt & tối ưu VPS Linux, Nginx">
                        🚀 Cấu hình & tối ưu VPS Linux, Nginx
                      </option>
                      <option value="Hỗ trợ tải & cài đặt mã nguồn số">
                        💻 Hỗ trợ mã nguồn số đã mua
                      </option>
                      <option value="Hỗ trợ nạp tiền ví qua PayOS">
                        💳 Vấn đề nạp ví / thanh toán PayOS
                      </option>
                      <option value="Kích hoạt khóa học lập trình">
                        📚 Khóa học lập trình & bài tập
                      </option>
                      <option value="Vấn đề kỹ thuật khác">⚡ Vấn đề kỹ thuật khác</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-foreground text-xs font-semibold">
                      Nội dung câu hỏi chi tiết <span className="text-destructive">*</span>:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Mô tả chi tiết câu hỏi, lỗi gặp phải hoặc link sản phẩm cần hỗ trợ..."
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      className="border-border/80 bg-muted/40 text-foreground focus:ring-primary w-full resize-none rounded-xl border p-3.5 text-xs leading-relaxed focus:ring-2 focus:outline-none sm:text-sm"
                      required
                    />
                  </div>

                  {/* Phần tải ảnh đính kèm / Screenshot */}
                  <div className="space-y-1.5">
                    <label className="text-foreground flex items-center justify-between text-xs font-semibold">
                      <span>Đính kèm hình ảnh / Chụp màn hình lỗi:</span>
                      {uploadingImage && (
                        <span className="text-primary flex items-center gap-1 text-xs font-normal">
                          <Loader2 className="size-3.5 animate-spin" /> Đang tải ảnh...
                        </span>
                      )}
                    </label>

                    {ticketImage ? (
                      <div className="border-border/80 bg-muted/40 relative inline-block overflow-hidden rounded-xl border p-1">
                        <Image
                          src={ticketImage}
                          alt="Đính kèm"
                          width={140}
                          height={90}
                          className="max-h-24 w-auto rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setTicketImage(null)}
                          className="bg-destructive text-destructive-foreground absolute top-2 right-2 rounded-full p-1 shadow-md transition hover:opacity-90"
                          title="Xóa ảnh"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={(e) => handleUploadImage(e, false)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="border-border/80 text-muted-foreground hover:border-primary hover:bg-muted/50 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-2.5 text-xs transition sm:text-sm"
                        >
                          <ImageIcon className="text-primary size-4" />
                          <span>Tải ảnh đính kèm (Ảnh chụp lỗi, hóa đơn...)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingTicket || uploadingImage}
                    className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-xs transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60 sm:text-base"
                  >
                    {isSubmittingTicket ? (
                      <>
                        <Loader2 className="size-4.5 animate-spin" />
                        <span>Đang gửi đơn hỗ trợ...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-4.5" />
                        <span>Gửi đơn để mở cổng Chat với Admin</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* TRƯỜNG HỢP 2: ĐÃ CÓ TICKET - THEO DÕI TRẠNG THÁI VÀ CHAT VỚI ADMIN */
              <div className="bg-background flex flex-1 flex-col overflow-hidden">
                {/* THANH TRẠNG THÁI CỦA ĐƠN */}
                <div className="border-border/60 bg-muted/20 flex shrink-0 items-center justify-between border-b px-5 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[11px]">Trạng thái:</span>
                    {ticketData?.status === 'PENDING' && (
                      <span className="border-warning/30 bg-warning/10 text-warning inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
                        <Clock className="size-3 animate-pulse" /> Chờ tiếp nhận
                      </span>
                    )}
                    {ticketData?.status === 'IN_PROGRESS' && (
                      <span className="border-success/30 bg-success/10 text-success inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
                        <span className="bg-success size-1.5 animate-pulse rounded-full" /> Đang
                        trao đổi trực tiếp
                      </span>
                    )}
                    {ticketData?.status === 'RESOLVED' && (
                      <span className="border-border/80 bg-muted/80 text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
                        <CheckCircle2 className="text-success size-3" /> Xử lý hoàn tất (Đã đóng)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/70 font-mono text-[11px]">
                      Mã: #{activeTicketId.slice(-6)}
                    </span>
                  </div>
                </div>

                {/* THÔNG BÁO KHI CHỜ DUYỆT */}
                {ticketData?.status === 'PENDING' && (
                  <div className="border-warning/30 bg-warning/10 text-warning flex shrink-0 items-center gap-2 border-b px-5 py-2.5 text-xs">
                    <Clock className="text-warning size-4 shrink-0" />
                    <span>
                      Đơn hỗ trợ đã gửi. Admin đang kiểm tra thông tin và sẽ kết nối chat trực tiếp
                      ngay!
                    </span>
                  </div>
                )}

                {/* DANH SÁCH TIN NHẮN TRONG TICKET */}
                <div
                  ref={chatContainerRef}
                  className="no-scrollbar bg-background/40 flex-1 space-y-3.5 overflow-y-auto p-4 text-xs sm:p-5 sm:text-sm"
                >
                  <div className="my-1 flex items-center justify-center">
                    <span className="border-border/80 bg-card/80 text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium shadow-2xs backdrop-blur-xs">
                      Chủ đề: {ticketData?.subject || 'Hỗ trợ kỹ thuật'}
                    </span>
                  </div>

                  {ticketData?.messages?.map((msg) => {
                    const isSystemNote = msg.senderName === 'Hệ thống hỗ trợ';
                    if (isSystemNote) {
                      return (
                        <div key={msg.id} className="my-2.5 flex justify-center px-4">
                          <div className="border-border/60 bg-muted/60 text-muted-foreground max-w-md rounded-xl border px-3.5 py-2 text-center text-xs leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    const isUser = msg.senderRole === 'USER';
                    const displaySenderName = isUser
                      ? msg.senderName
                      : msg.senderName === 'Admin'
                        ? 'Hoàng Anh Toàn'
                        : msg.senderName;

                    return (
                      <div
                        key={msg.id}
                        className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
                      >
                        <div className="text-muted-foreground mb-1 flex items-center gap-1.5 px-1 text-[10px]">
                          <span className="text-foreground font-semibold">{displaySenderName}</span>
                          {!isUser && (
                            <span className="border-border/60 bg-primary/10 text-primary rounded-md border px-1.5 py-0.5 text-[9px] font-bold">
                              Admin
                            </span>
                          )}
                        </div>
                        <div
                          className={cn(
                            'max-w-[85%] space-y-2 rounded-2xl px-4 py-2.5 leading-relaxed shadow-xs',
                            isUser
                              ? 'bg-primary text-primary-foreground rounded-tr-xs'
                              : 'bg-card border-border/80 text-foreground rounded-tl-xs border',
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.imageUrl && (
                            <div className="mt-1 overflow-hidden rounded-xl border border-black/10">
                              <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                <Image
                                  src={msg.imageUrl}
                                  alt="Ảnh đính kèm"
                                  width={240}
                                  height={160}
                                  className="max-h-40 w-auto rounded-lg object-cover transition hover:opacity-90"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                        <span className="text-muted-foreground/70 mt-1 px-1 text-[10px]">
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Ô NHẬP TIN NHẮN HOẶC TRẠNG THÁI ĐÃ ĐÓNG */}
                <div className="border-border/80 bg-card shrink-0 border-t p-3 sm:p-4">
                  {ticketData?.status === 'RESOLVED' ? (
                    <div className="border-border/80 bg-muted/40 flex flex-col items-center justify-between gap-3 rounded-2xl border p-3 text-xs sm:flex-row sm:p-3.5">
                      <div className="text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="text-success size-4 shrink-0" />
                        <span>Yêu cầu này đã được đánh dấu hoàn tất. Đoạn chat đã đóng.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartNewTicket}
                        className="bg-primary text-primary-foreground flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xs transition hover:opacity-90 active:scale-95"
                      >
                        <PlusCircle className="size-3.5" />
                        <span>Gửi yêu cầu mới</span>
                      </button>
                    </div>
                  ) : ticketData?.status === 'PENDING' ? (
                    <div className="border-border/80 bg-muted/30 text-muted-foreground rounded-2xl border py-3 text-center text-xs">
                      ⏳ Vui lòng chờ Admin Hoàng Anh Toàn tiếp nhận đơn hỗ trợ để bắt đầu nhắn
                      tin...
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="space-y-2">
                      {chatImage && (
                        <div className="border-border bg-muted relative inline-block rounded-lg border p-1">
                          <Image
                            src={chatImage}
                            alt="Ảnh đính kèm"
                            width={60}
                            height={40}
                            className="max-h-12 w-auto rounded object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setChatImage(null)}
                            className="bg-destructive text-destructive-foreground absolute -top-1.5 -right-1.5 rounded-full p-0.5"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          ref={chatFileInputRef}
                          onChange={(e) => handleUploadImage(e, true)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => chatFileInputRef.current?.click()}
                          disabled={uploadingImage || isSendingMessage}
                          className="border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl border transition"
                          title="Đính kèm ảnh"
                        >
                          <Paperclip className="size-4" />
                        </button>

                        <input
                          type="text"
                          placeholder="Nhập tin nhắn gửi Admin..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          disabled={isSendingMessage}
                          className="border-border/80 bg-muted/40 text-foreground focus:ring-primary flex-1 rounded-xl border px-3.5 py-2.5 text-xs focus:ring-2 focus:outline-none sm:text-sm"
                        />

                        <button
                          type="submit"
                          disabled={(!chatInput.trim() && !chatImage) || isSendingMessage}
                          className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-40"
                          title="Gửi tin nhắn"
                        >
                          {isSendingMessage ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Send className="size-4" />
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CỤM NÚT ĐIỀU HƯỚNG CỐ ĐỊNH CHÍNH THEO HÀNG DỌC (TAI NGHE Ở TRÊN, KÊNH XOAY VÒNG Ở DƯỚI) */}
      <div className="pointer-events-auto fixed right-6 bottom-6 z-40 flex flex-col items-end gap-3 select-none">
        {/* NÚT TAI NGHE CỐ ĐỊNH Ở TRÊN: MỞ KHUNG POPUP GỬI ĐƠN & CHAT TRỰC TIẾP VỚI ADMIN */}
        <div className="group flex items-center gap-2">
          <span className="bg-card/95 border-border text-foreground hidden rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap opacity-0 shadow-md backdrop-blur-md transition-opacity group-hover:opacity-100 sm:inline-block">
            🎧 Chat & Gửi yêu cầu hỗ trợ Admin Hoàng Anh Toàn
          </span>
          <button
            type="button"
            onClick={() => setIsChatOpen((prev) => !prev)}
            className="bg-primary text-primary-foreground ring-primary/25 hover:bg-primary/90 group relative flex size-12 items-center justify-center rounded-full shadow-xl ring-4 transition-all hover:scale-105 active:scale-95 sm:size-13"
            title="Chat và gửi yêu cầu hỗ trợ trực tiếp tới Admin Hoàng Anh Toàn"
            aria-label="Chat trực tiếp với Admin Hoàng Anh Toàn"
          >
            {/* Radar ripple rings */}
            <span className="border-primary/60 absolute -inset-1 animate-ping rounded-full border opacity-75" />
            <Headset className="size-6 text-white transition-transform duration-300 group-hover:rotate-12" />
          </button>
        </div>

        {/* NÚT QUẢ VÒNG TRÒN XOAY VÒNG 15S Ở DƯỚI (MESSENGER, TIKTOK, ZALO, TELE, YOUTUBE, X) */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            {/* Nút chính xoay vòng các kênh mỗi 15 giây - bấm vào mở thẳng trang web */}
            <button
              type="button"
              onClick={() => window.open(activeChannel.href, '_blank', 'noopener,noreferrer')}
              className={`relative size-12 rounded-full sm:size-13 ${
                activeChannel.bgColor
              } flex items-center justify-center text-white shadow-xl ring-4 transition-all hover:scale-110 active:scale-95 ${
                activeChannel.ringColor
              } ${isRotatingAnim ? 'scale-90 rotate-[360deg] duration-700 ease-in-out' : 'duration-300'} group cursor-pointer`}
              title={`${activeChannel.tooltip} (Bấm để mở trang)`}
              aria-label={`Mở trang ${activeChannel.name}`}
            >
              <ActiveIcon
                className={`size-6 text-white transition-transform ${
                  isRotatingAnim ? 'scale-0' : 'scale-100 group-hover:scale-110'
                }`}
              />
            </button>

            {/* Dấu chấm đếm nhịp xoay 15s */}
            <span
              className="border-background bg-warning pointer-events-none absolute -top-1 -right-1 size-3.5 rounded-full border-2 shadow-xs"
              title="Đổi kênh tự động sau 15 giây"
            />
          </div>
        </div>
      </div>
    </>
  );
}
