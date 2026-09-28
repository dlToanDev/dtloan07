'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import {
  type LoginAdConfig,
  type AnnouncementItem,
  type AnnouncementType,
  saveLoginAdConfig,
  uploadAdImage,
  createAnnouncement,
  toggleAnnouncementState,
  deleteAnnouncement,
  getProCouponsForAnnouncement,
} from '@/server/actions/settings';
import {
  Sparkles,
  Megaphone,
  Image as ImageIcon,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Upload,
  Tag,
  Package,
  Rocket,
  Info,
  Settings,
  X,
  Radio,
  Gift,
  Gamepad2,
  HelpCircle,
  Table as TableIcon,
  Palette,
  Check,
  FileSpreadsheet,
  Edit3,
  List,
  Crown,
  Globe,
} from 'lucide-react';
import Link from 'next/link';
import { AnnouncementDetailModal } from '@/components/announcements/announcement-detail-modal';
import { markdownToHtml } from '@/lib/editor-converter';
import { RichTextEditor } from '@/components/admin/rich-text-editor';

interface SettingsManagerProps {
  initialAdConfig: LoginAdConfig;
  initialAnnouncements: AnnouncementItem[];
}

type WheelSegment = { id: string; label: string; code: string; color: string; isWin: boolean };

export function SettingsManager({ initialAdConfig, initialAnnouncements }: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<'ad' | 'announcements'>('ad');

  // ==========================================
  // STATE: CẤU HÌNH QUẢNG CÁO ĐĂNG NHẬP
  // ==========================================
  const [adConfig, setAdConfig] = useState<LoginAdConfig>(initialAdConfig);
  const [isSavingAd, setIsSavingAd] = useState(false);
  const [isUploadingAdImage, setIsUploadingAdImage] = useState(false);
  const [adMessage, setAdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  // State Preview Modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCountdown, setPreviewCountdown] = useState(5);
  const [previewCanClose, setPreviewCanClose] = useState(false);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // STATE: THÔNG BÁO TÍNH NĂNG HỆ THỐNG
  // ==========================================
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements);
  const [isCreatingAnnounce, setIsCreatingAnnounce] = useState(false);
  const [announceMsg, setAnnounceMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  // Form thêm thông báo mới
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<AnnouncementType>('NEW_PRODUCT');
  const [newBadge, setNewBadge] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkText, setNewLinkText] = useState('Xem ngay');
  const [newIsActive, setNewIsActive] = useState(true);
  const [newShowBanner, setNewShowBanner] = useState(true);
  const [newProOnly, setNewProOnly] = useState(false);
  const [syncShopCoupon, setSyncShopCoupon] = useState(true);

  // Danh sách coupon Shop để chọn nhanh
  const [availableCoupons, setAvailableCoupons] = useState<
    Array<{
      id: string;
      code: string | null;
      name: string;
      type: string;
      value: number;
      maxDiscountVnd: number | null;
      endsAt: Date | null;
      proOnly: boolean;
    }>
  >([]);

  useEffect(() => {
    getProCouponsForAnnouncement()
      .then((data) => setAvailableCoupons(data))
      .catch(() => {});
  }, []);

  // Voucher & Bài viết chi tiết & Mini Game
  const [newDetailContent, setNewDetailContent] = useState('');
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherDiscount, setNewVoucherDiscount] = useState('');
  const [newGameType, setNewGameType] = useState<'NONE' | 'LUCKY_WHEEL' | 'QUIZ'>('NONE');

  // Quản lý các ô Vòng quay may mắn (tự điền 10%, 10k, 20%, 50k, Freeship...)
  const [wheelSegments, setWheelSegments] = useState<WheelSegment[]>([
    { id: '1', label: '10%', code: 'SALE10', color: '#3b82f6', isWin: true },
    { id: '2', label: '10k', code: 'DEV10K', color: '#10b981', isWin: true },
    { id: '3', label: '20%', code: 'SALE20', color: '#8b5cf6', isWin: true },
    { id: '4', label: '50k', code: 'PRO50K', color: '#f59e0b', isWin: true },
    { id: '5', label: 'Freeship', code: 'FREESHIP', color: '#06b6d4', isWin: true },
    { id: '6', label: 'May mắn lần sau', code: '', color: '#64748b', isWin: false },
    { id: '7', label: '100k', code: 'VIP100K', color: '#ec4899', isWin: true },
    { id: '8', label: 'Giảm 15%', code: 'SAVE15', color: '#ef4444', isWin: true },
  ]);

  // Cấu hình game Quiz (Trắc nghiệm động)
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState<string[]>([
    'Bootstrap',
    'Tailwind CSS',
    'Ant Design',
    'Bulma',
  ]);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState(1);
  const [quizRewardCode, setQuizRewardCode] = useState('');

  // Chế độ soạn thảo bài viết & xem trước bảng
  const [contentTab, setContentTab] = useState<'edit' | 'preview'>('edit');
  const [useRichEditor, setUseRichEditor] = useState(false);

  // Modal xem trước bài viết chi tiết / test game
  const [selectedAnnouncementForPreview, setSelectedAnnouncementForPreview] =
    useState<AnnouncementItem | null>(null);

  // ==========================================
  // HANDLERS: QUẢNG CÁO
  // ==========================================
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAdImage(true);
    setAdMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadAdImage(formData);
      if (res.success && res.url) {
        setAdConfig((prev) => ({ ...prev, imageUrl: res.url! }));
        setAdMessage({ type: 'success', text: 'Tải ảnh lên thành công!' });
      } else {
        setAdMessage({ type: 'error', text: res.error || 'Lỗi khi tải ảnh.' });
      }
    } catch {
      setAdMessage({ type: 'error', text: 'Không thể kết nối máy chủ.' });
    } finally {
      setIsUploadingAdImage(false);
    }
  };

  const handleSaveAdConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAd(true);
    setAdMessage(null);

    try {
      const res = await saveLoginAdConfig(adConfig);
      if (res.success && res.config) {
        setAdConfig(res.config);
        setAdMessage({
          type: 'success',
          text: 'Đã lưu cấu hình quảng cáo thành công!',
        });
      } else {
        setAdMessage({ type: 'error', text: res.error || 'Lỗi lưu cấu hình.' });
      }
    } catch {
      setAdMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu cấu hình.' });
    } finally {
      setIsSavingAd(false);
    }
  };

  const startPreview = () => {
    if (!adConfig.imageUrl) {
      alert('Vui lòng thêm link ảnh hoặc tải ảnh lên để xem trước.');
      return;
    }
    setPreviewOpen(true);
    const secs = adConfig.countdownSeconds || 5;
    setPreviewCountdown(secs);
    setPreviewCanClose(false);

    let current = secs;
    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    previewTimerRef.current = setInterval(() => {
      current -= 1;
      setPreviewCountdown(current);
      if (current <= 0) {
        setPreviewCanClose(true);
        if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      }
    }, 1000);
  };

  const closePreview = () => {
    if (!previewCanClose) return;
    setPreviewOpen(false);
    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
  };

  // ==========================================
  // HANDLERS: THÔNG BÁO TÍNH NĂNG
  // ==========================================
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setAnnounceMsg({ type: 'error', text: 'Vui lòng nhập đầy đủ tiêu đề và nội dung.' });
      return;
    }

    setIsCreatingAnnounce(true);
    setAnnounceMsg(null);

    // Xử lý gameConfig theo loại game đã chọn
    let gameConfigStr: string | undefined = undefined;
    if (newGameType === 'LUCKY_WHEEL') {
      const validSegments = wheelSegments.filter((s) => s.label.trim() !== '');
      gameConfigStr = JSON.stringify({
        segments: validSegments.length >= 2 ? validSegments : wheelSegments,
      });
    } else if (newGameType === 'QUIZ') {
      const validOptions = quizOptions.filter((opt) => opt.trim() !== '');
      if (validOptions.length >= 2 && quizQuestion.trim()) {
        gameConfigStr = JSON.stringify({
          question: quizQuestion.trim(),
          options: validOptions,
          correctIndex: quizCorrectIndex,
          rewardCode: quizRewardCode || newVoucherCode || undefined,
          rewardDiscount: newVoucherDiscount || undefined,
        });
      }
    }

    try {
      const res = await createAnnouncement({
        title: newTitle,
        content: newContent,
        type: newType,
        badge: newBadge || undefined,
        linkUrl: newLinkUrl || undefined,
        linkText: newLinkText || undefined,
        isActive: newIsActive,
        showBanner: newShowBanner,
        detailContent: newDetailContent || undefined,
        voucherCode: newVoucherCode || undefined,
        voucherDiscount: newVoucherDiscount || undefined,
        gameType: newGameType === 'NONE' ? undefined : (newGameType as 'LUCKY_WHEEL' | 'QUIZ'),
        gameConfig: gameConfigStr,
        proOnly: newProOnly,
        syncShopCoupon: syncShopCoupon,
      });

      if (res.success && res.item) {
        setAnnouncements((prev) => [res.item!, ...prev]);
        setAnnounceMsg({ type: 'success', text: 'Đã tạo thông báo tính năng thành công!' });
        // Reset form
        setNewTitle('');
        setNewContent('');
        setNewBadge('');
        setNewLinkUrl('');
        setNewLinkText('Xem ngay');
        setNewDetailContent('');
        setNewVoucherCode('');
        setNewVoucherDiscount('');
        setNewProOnly(false);
        setNewGameType('NONE');
        setQuizQuestion('');
        setQuizOptions(['Bootstrap', 'Tailwind CSS', 'Ant Design', 'Bulma']);
        setQuizCorrectIndex(1);
        setQuizRewardCode('');
      } else {
        setAnnounceMsg({ type: 'error', text: res.error || 'Lỗi khi tạo thông báo.' });
      }
    } catch {
      setAnnounceMsg({ type: 'error', text: 'Có lỗi xảy ra.' });
    } finally {
      setIsCreatingAnnounce(false);
    }
  };

  const handleSelectExistingCoupon = (couponId: string) => {
    const found = availableCoupons.find((c) => c.id === couponId);
    if (!found) return;
    if (found.code) setNewVoucherCode(found.code);
    const discountText =
      found.type === 'PERCENT'
        ? `Giảm ${found.value}%${found.maxDiscountVnd ? ` (tối đa ${found.maxDiscountVnd.toLocaleString('vi-VN')}đ)` : ''}`
        : found.type === 'FIXED'
          ? `Giảm ${found.value.toLocaleString('vi-VN')}đ`
          : 'Miễn phí ship';
    setNewVoucherDiscount(discountText);
    if (found.proOnly) {
      setNewProOnly(true);
      setNewBadge('👑 Ưu đãi PRO VIP');
    }
  };

  // Thao tác với các ô Vòng quay may mắn
  const handleAddWheelSegment = () => {
    if (wheelSegments.length >= 12) {
      alert('Vòng quay hỗ trợ tối đa 12 ô thưởng!');
      return;
    }
    const palette = [
      '#3b82f6',
      '#10b981',
      '#8b5cf6',
      '#f59e0b',
      '#06b6d4',
      '#ec4899',
      '#ef4444',
      '#64748b',
    ];
    const nextColor = palette[wheelSegments.length % palette.length] || '#3b82f6';
    setWheelSegments((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        label: '10k',
        code: '',
        color: nextColor,
        isWin: true,
      },
    ]);
  };

  const handleRemoveWheelSegment = (id: string) => {
    if (wheelSegments.length <= 3) {
      alert('Vòng quay cần tối thiểu 3 ô thưởng!');
      return;
    }
    setWheelSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateWheelSegment = (
    id: string,
    field: keyof WheelSegment,
    value: WheelSegment[keyof WheelSegment],
  ) => {
    setWheelSegments((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const setWheelPreset = (type: 'cash' | 'percent' | 'mixed') => {
    if (type === 'cash') {
      setWheelSegments([
        { id: '1', label: '10k', code: 'DEV10K', color: '#10b981', isWin: true },
        { id: '2', label: '20k', code: 'DEV20K', color: '#3b82f6', isWin: true },
        { id: '3', label: '50k', code: 'DEV50K', color: '#8b5cf6', isWin: true },
        { id: '4', label: 'May mắn', code: '', color: '#64748b', isWin: false },
        { id: '5', label: '100k', code: 'DEV100K', color: '#f59e0b', isWin: true },
        { id: '6', label: 'Freeship', code: 'SHIP0D', color: '#06b6d4', isWin: true },
      ]);
    } else if (type === 'percent') {
      setWheelSegments([
        { id: '1', label: '10%', code: 'SALE10', color: '#3b82f6', isWin: true },
        { id: '2', label: '15%', code: 'SALE15', color: '#10b981', isWin: true },
        { id: '3', label: '20%', code: 'SALE20', color: '#8b5cf6', isWin: true },
        { id: '4', label: '30%', code: 'SALE30', color: '#f59e0b', isWin: true },
        { id: '5', label: 'Chúc may mắn', code: '', color: '#64748b', isWin: false },
        { id: '6', label: '50%', code: 'SALE50', color: '#ec4899', isWin: true },
        { id: '7', label: '5%', code: 'SALE05', color: '#06b6d4', isWin: true },
        { id: '8', label: 'Freeship', code: 'FREESHIP', color: '#ef4444', isWin: true },
      ]);
    } else {
      setWheelSegments([
        { id: '1', label: '10%', code: 'SALE10', color: '#3b82f6', isWin: true },
        { id: '2', label: '10k', code: 'DEV10K', color: '#10b981', isWin: true },
        { id: '3', label: '20%', code: 'SALE20', color: '#8b5cf6', isWin: true },
        { id: '4', label: '50k', code: 'PRO50K', color: '#f59e0b', isWin: true },
        { id: '5', label: 'Freeship', code: 'FREESHIP', color: '#06b6d4', isWin: true },
        { id: '6', label: 'May mắn lần sau', code: '', color: '#64748b', isWin: false },
        { id: '7', label: '100k', code: 'VIP100K', color: '#ec4899', isWin: true },
        { id: '8', label: 'Giảm 15%', code: 'SAVE15', color: '#ef4444', isWin: true },
      ]);
    }
  };

  // Thao tác với câu hỏi trắc nghiệm
  const handleAddQuizOption = () => {
    if (quizOptions.length >= 6) {
      alert('Tối đa 6 lựa chọn đáp án!');
      return;
    }
    setQuizOptions((prev) => [...prev, '']);
  };

  const handleRemoveQuizOption = (index: number) => {
    if (quizOptions.length <= 2) {
      alert('Câu hỏi cần tối thiểu 2 đáp án!');
      return;
    }
    setQuizOptions((prev) => prev.filter((_, i) => i !== index));
    if (quizCorrectIndex >= index && quizCorrectIndex > 0) {
      setQuizCorrectIndex((prev) => prev - 1);
    }
  };

  const handleUpdateQuizOption = (index: number, val: string) => {
    setQuizOptions((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  // Chèn mẫu bảng Markdown vào bài viết
  const insertTableTemplate = (type: 'voucher' | 'prize' | 'rules') => {
    let tableMd = '';
    if (type === 'voucher') {
      tableMd = `\n| Cấp độ tài khoản | Mức giảm giá | Điều kiện áp dụng |\n| :--- | :--- | :--- |\n| Thành viên mới | Giảm 10% | Đơn hàng từ 50.000đ |\n| Khách hàng thân thiết | Giảm 25% | Đơn hàng từ 200.000đ |\n| Khách hàng VIP | Giảm 50% | Áp dụng toàn bộ Shop |\n`;
    } else if (type === 'prize') {
      tableMd = `\n| Phần quà / Ô quay | Mã Voucher | Hạn sử dụng |\n| :--- | :--- | :--- |\n| Voucher 10% & 10k | SALE10 / DEV10K | 7 ngày |\n| Voucher 20% & 50k | SALE20 / PRO50K | 14 ngày |\n| Miễn phí vận chuyển | FREESHIP | 30 ngày |\n`;
    } else {
      tableMd = `\n| Tiêu chí | Nội dung quy định |\n| :--- | :--- |\n| Thời gian áp dụng | Từ hôm nay đến hết ngày 31/12/2026 |\n| Phạm vi áp dụng | Toàn bộ sản phẩm và khóa học |\n| Giới hạn tài khoản | 1 lượt tham gia / ngày |\n`;
    }
    setNewDetailContent((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + tableMd);
  };

  const handleToggle = (id: string, field: 'isActive' | 'showBanner' | 'proOnly') => {
    startTransition(async () => {
      const res = await toggleAnnouncementState(id, field);
      if (res.success && res.newValue !== undefined) {
        setAnnouncements((prev) =>
          prev.map((item) => (item.id === id ? { ...item, [field]: res.newValue! } : item)),
        );
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này không?')) return;
    startTransition(async () => {
      const res = await deleteAnnouncement(id);
      if (res.success) {
        setAnnouncements((prev) => prev.filter((item) => item.id !== id));
      }
    });
  };

  const setSampleData = (
    sampleType: 'NEW_PRODUCT' | 'VOUCHER' | 'LUCKY_WHEEL' | 'QUIZ' | 'PRO_VOUCHER',
  ) => {
    if (sampleType === 'NEW_PRODUCT') {
      setNewType('NEW_PRODUCT');
      setNewBadge('Sản phẩm mới');
      setNewTitle('Khóa học Next.js 15 Fullstack & DevOps Production');
      setNewContent('Học thực chiến xây dựng hệ thống chịu tải cao, Docker & VPS deploy.');
      setNewDetailContent(
        '🔥 Khóa học mới được cập nhật toàn diện với Next.js 15 App Router, Server Actions, Prisma ORM và kiến trúc Clean Architecture.\n\n✨ Quyền lợi học viên:\n- Hơn 60+ video bài giảng chi tiết.\n- Hỗ trợ giải đáp 1:1 qua nhóm Discord riêng.\n- Source code mẫu hoàn chỉnh và được cập nhật trọn đời.',
      );
      setNewLinkUrl('/courses');
      setNewLinkText('Xem khóa học');
      setNewGameType('NONE');
      setNewVoucherCode('');
      setNewVoucherDiscount('');
      setNewProOnly(false);
    } else if (sampleType === 'VOUCHER') {
      setNewType('VOUCHER');
      setNewBadge('Voucher 30%');
      setNewTitle('Mã giảm giá HELLO2026');
      setNewContent('Giảm ngay 30% cho tất cả đơn hàng trên Shop khi thanh toán hôm nay.');
      setNewVoucherCode('HELLO2026');
      setNewVoucherDiscount('Giảm 30%');
      setNewDetailContent(
        '🎁 Mừng năm mới 2026, tặng ngay bạn voucher giảm giá đặc biệt:\n- Áp dụng: Toàn bộ sản phẩm áo thun, phụ kiện công nghệ trên Shop.\n- Hạn dùng: Đến hết tháng.\n- Không giới hạn số lần sử dụng cho tài khoản VIP.',
      );
      setNewLinkUrl('/shop');
      setNewLinkText('Dùng mã ngay');
      setNewGameType('NONE');
      setNewProOnly(false);
    } else if (sampleType === 'PRO_VOUCHER') {
      setNewType('VOUCHER');
      setNewBadge('👑 Dành riêng PRO');
      setNewTitle('👑 Đặc quyền VIP: Tặng Voucher giảm 50% toàn bộ Shop');
      setNewContent(
        'Món quà tri ân đặc quyền dành riêng cho thành viên đã nâng cấp tài khoản PRO. Nhận ngay voucher giảm 50% toàn Shop!',
      );
      setNewVoucherCode('PROVIP50');
      setNewVoucherDiscount('Giảm 50%');
      setNewProOnly(true);
      setNewShowBanner(true);
      setNewDetailContent(
        '👑 **ĐẶC QUYỀN DÀNH RIÊNG CHO THÀNH VIÊN PRO**\n\nCảm ơn bạn đã luôn đồng hành và nâng cấp tài khoản PRO cùng chúng tôi! Dưới đây là mã voucher bí mật dành riêng cho bạn:\n\n### 🎁 Bảng thông tin ưu đãi:\n\n| Hạng mục | Chi tiết ưu đãi |\n| :--- | :--- |\n| Mã voucher | `PROVIP50` |\n| Mức giảm | 50% tổng giá trị đơn hàng |\n| Đối tượng áp dụng | Chỉ tài khoản PRO đang còn hạn |\n| Phạm vi áp dụng | Tất cả sản phẩm số, áo thun & phụ kiện Shop |\n\n> [!NOTE]\n> Mã voucher này được mã hóa bảo mật và chỉ các tài khoản PRO mới có thể sử dụng khi thanh toán tại Shop.',
      );
      setNewLinkUrl('/shop');
      setNewLinkText('Mua sắm với ưu đãi PRO');
      setNewGameType('NONE');
    } else if (sampleType === 'LUCKY_WHEEL') {
      setNewType('VOUCHER');
      setNewBadge('Vòng quay may mắn');
      setNewTitle('Vòng quay may mắn: 100% Trúng thưởng Voucher khủng');
      setNewContent(
        'Tham gia thử vận may với Vòng quay may mắn hôm nay để nhận ngay voucher giảm đến 50%!',
      );
      setNewVoucherCode('WHEEL35');
      setNewVoucherDiscount('Giảm 35%');
      setNewDetailContent(
        '🎡 **VÒNG QUAY MAY MẮN - QUAY LÀ TRÚNG!**\n\n### 🎁 Bảng cơ cấu giải thưởng:\n\n| Ô trúng thưởng | Phần thưởng | Hạn sử dụng |\n| :--- | :--- | :--- |\n| Ô 10% & 10k | Voucher giảm trực tiếp | 7 ngày |\n| Ô 20% & 50k | Voucher cho đơn từ 200k | 14 ngày |\n| Ô Freeship | Miễn phí giao hàng toàn quốc | 30 ngày |\n| Ô 100k | Voucher VIP giảm 100k | 30 ngày |\n\n### 📌 Thể lệ tham gia:\n1. Mỗi khách hàng có 1 lượt quay miễn phí mỗi ngày.\n2. Kim dừng ở ô nào bạn sẽ nhận được mã voucher của ô đó.\n3. Sao chép mã và dùng ngay khi thanh toán tại Shop!',
      );
      setNewLinkUrl('/shop');
      setNewLinkText('Đến Shop sắm đồ');
      setNewGameType('LUCKY_WHEEL');
      setNewProOnly(false);
      setWheelPreset('mixed');
    } else if (sampleType === 'QUIZ') {
      setNewType('FEATURE');
      setNewBadge('Đố vui nhận quà');
      setNewTitle('Thử tài Lập trình viên - Trả lời đúng nhận Voucher 25%');
      setNewContent(
        'Bạn tự tin với kiến thức công nghệ? Trả lời đúng câu hỏi dưới đây để mở khóa Voucher bí mật!',
      );
      setNewVoucherCode('QUIZDEV25');
      setNewVoucherDiscount('Giảm 25%');
      setNewDetailContent(
        '🧠 **MINIGAME TRÍ TUỆ DÀNH CHO DEVELOPER**\n\n### 📋 Bảng quy định & Điều kiện:\n\n| Tiêu chí | Nội dung quy định |\n| :--- | :--- |\n| Thời gian | Áp dụng từ hôm nay đến hết tháng |\n| Đối tượng | Tất cả tài khoản đã đăng ký |\n| Phần thưởng | Voucher giảm 25% áp dụng mọi sản phẩm |\n\n- Đọc câu hỏi và chọn 1 trong 4 đáp án đúng nhất.\n- Trả lời chính xác để nhận ngay mã voucher độc quyền giảm 25%!',
      );
      setNewLinkUrl('/shop');
      setNewLinkText('Khám phá Shop');
      setNewGameType('QUIZ');
      setNewProOnly(false);
      setQuizQuestion(
        'Framework CSS nào sử dụng triết lý utility-first phổ biến nhất hiện nay trong hệ sinh thái Next.js/React?',
      );
      setQuizOptions(['Bootstrap', 'Tailwind CSS', 'Ant Design', 'Bulma']);
      setQuizCorrectIndex(1);
      setQuizRewardCode('QUIZDEV25');
    }
  };

  return (
    <div className="space-y-8">
      {/* Tiêu đề trang */}
      <div className="flex flex-col gap-2 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary rounded-xl p-2">
              <Settings className="size-6" />
            </div>
            <div>
              <h1 className="text-foreground text-2xl font-bold tracking-tight">
                Cài đặt hệ thống
              </h1>
              <p className="text-muted-foreground text-sm">
                Quản lý banner quảng cáo đăng nhập đếm ngược 5s và các thông báo tính năng, voucher
                hệ thống.
              </p>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="bg-muted/60 border-border flex items-center rounded-xl border p-1">
          <button
            type="button"
            onClick={() => setActiveTab('ad')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'ad'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Megaphone className="size-4 text-amber-500" />
            <span>Popup quảng cáo (5s)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'announcements'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="size-4 text-blue-500" />
            <span>Thông báo tính năng / Voucher</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CÀI ĐẶT POPUP QUẢNG CÁO (5s Countdown)                             */}
      {/* ========================================================================= */}
      {activeTab === 'ad' && (
        <div className="space-y-6">
          {adMessage && (
            <div
              className={`flex items-center gap-2.5 rounded-xl border p-4 text-sm ${
                adMessage.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              {adMessage.type === 'success' ? (
                <CheckCircle2 className="size-5 shrink-0" />
              ) : (
                <AlertCircle className="size-5 shrink-0" />
              )}
              <p>{adMessage.text}</p>
            </div>
          )}

          <form onSubmit={handleSaveAdConfig} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Cột trái: Form cấu hình */}
            <div className="space-y-6 lg:col-span-7">
              {/* Card Bật/Tắt */}
              <div className="border-border bg-card space-y-4 rounded-2xl border p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-foreground text-base font-semibold">
                      Trạng thái quảng cáo
                    </h2>
                    <p className="text-muted-foreground text-xs">
                      Bật để hiển thị modal quảng cáo khi người dùng đăng nhập vào hệ thống
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={adConfig.enabled}
                      onChange={(e) =>
                        setAdConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                      className="peer sr-only"
                    />
                    <div className="bg-muted peer after:border-border peer-checked:bg-primary h-6 w-11 rounded-full peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
              </div>

              {/* Card Cấu hình hình ảnh & Nội dung */}
              <div className="border-border bg-card space-y-5 rounded-2xl border p-6 shadow-sm">
                <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
                  <ImageIcon className="text-primary size-4" />
                  Hình ảnh & Nội dung quảng cáo
                </h2>

                {/* Upload hoặc Link ảnh */}
                <div className="space-y-3">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Hình ảnh quảng cáo *
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <input
                        type="url"
                        placeholder="https://example.com/banner-qc.png hoặc tải ảnh bên dưới"
                        value={adConfig.imageUrl}
                        onChange={(e) =>
                          setAdConfig((prev) => ({ ...prev, imageUrl: e.target.value }))
                        }
                        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                      />
                    </div>
                    <label className="bg-muted/80 hover:bg-muted text-foreground border-border inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors">
                      {isUploadingAdImage ? (
                        <Loader2 className="text-primary size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      <span>{isUploadingAdImage ? 'Đang tải...' : 'Tải từ máy tính'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadImage}
                        disabled={isUploadingAdImage}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Hỗ trợ định dạng: PNG, JPG, WebP, GIF. Kích thước gợi ý: tỉ lệ 4:5 hoặc 1:1, tối
                    đa 8MB.
                  </p>
                </div>

                {/* Tiêu đề quảng cáo */}
                <div className="space-y-1.5">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Tiêu đề thông điệp (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Siêu khuyến mãi tháng này - Nhận ngay ưu đãi 50%"
                    value={adConfig.title}
                    onChange={(e) => setAdConfig((prev) => ({ ...prev, title: e.target.value }))}
                    className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>

                {/* Link điều hướng */}
                <div className="space-y-1.5">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Đường dẫn khi click vào ảnh (URL chuyển hướng)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="VD: /shop, /courses hoặc https://shopee.vn/..."
                      value={adConfig.linkUrl}
                      onChange={(e) =>
                        setAdConfig((prev) => ({ ...prev, linkUrl: e.target.value }))
                      }
                      className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary/40 w-full rounded-xl border py-2.5 pr-10 pl-3.5 text-sm focus:ring-2 focus:outline-none"
                    />
                    <ExternalLink className="text-muted-foreground pointer-events-none absolute top-3 right-3.5 size-4" />
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Nếu điền link, khi khách nhấn vào ảnh hoặc nút chi tiết sẽ chuyển tới link này.
                  </p>
                </div>
              </div>

              {/* Card Quy tắc hiển thị & Đếm ngược 5s */}
              <div className="border-border bg-card space-y-5 rounded-2xl border p-6 shadow-sm">
                <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
                  <Clock className="size-4 text-amber-500" />
                  Thời gian đếm ngược & Đối tượng
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Số giây chờ tắt */}
                  <div className="space-y-1.5">
                    <label className="text-foreground block text-xs font-semibold">
                      Số giây đếm ngược hiện nút X (Mặc định: 5s)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={adConfig.countdownSeconds}
                        onChange={(e) =>
                          setAdConfig((prev) => ({
                            ...prev,
                            countdownSeconds: Number(e.target.value) || 5,
                          }))
                        }
                        className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                      />
                      <span className="text-muted-foreground shrink-0 text-xs font-medium">
                        giây
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Trong khoảng thời gian này, người dùng chưa thể bấm X để tắt quảng cáo.
                    </p>
                  </div>

                  {/* Đối tượng áp dụng */}
                  <div className="space-y-1.5">
                    <label className="text-foreground block text-xs font-semibold">
                      Đối tượng nhìn thấy
                    </label>
                    <select
                      value={adConfig.targetAudience}
                      onChange={(e) =>
                        setAdConfig((prev) => ({
                          ...prev,
                          targetAudience: e.target.value as 'authenticated' | 'all',
                        }))
                      }
                      className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                    >
                      <option value="authenticated">Người dùng đã đăng nhập (Khuyên dùng)</option>
                      <option value="all">Tất cả khách truy cập website</option>
                    </select>
                    <p className="text-muted-foreground text-[11px]">
                      &quot;Người dùng đã đăng nhập&quot; sẽ hiện khi thành viên login vào web.
                    </p>
                  </div>
                </div>

                {/* Tần suất hiển thị */}
                <div className="space-y-1.5">
                  <label className="text-foreground block text-xs font-semibold">
                    Tần suất hiển thị lặp lại
                  </label>
                  <select
                    value={adConfig.frequency}
                    onChange={(e) =>
                      setAdConfig((prev) => ({
                        ...prev,
                        frequency: e.target.value as
                          'once_per_session' | 'every_login' | 'once_per_day',
                      }))
                    }
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  >
                    <option value="once_per_session">
                      1 lần trong mỗi phiên duyệt web (Khuyên dùng)
                    </option>
                    <option value="once_per_day">1 lần mỗi 24 giờ</option>
                    <option value="every_login">Mỗi lần đăng nhập mới</option>
                  </select>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingAd}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSavingAd ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  <span>{isSavingAd ? 'Đang lưu cài đặt...' : 'Lưu cài đặt quảng cáo'}</span>
                </button>

                <button
                  type="button"
                  onClick={startPreview}
                  className="border-border bg-card text-foreground hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors"
                >
                  <Eye className="text-primary size-4" />
                  <span>Xem thử Popup (5s đếm ngược)</span>
                </button>
              </div>
            </div>

            {/* Cột phải: Preview Mockup */}
            <div className="space-y-4 lg:col-span-5">
              <div className="border-border bg-card sticky top-20 space-y-4 rounded-2xl border p-6 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-foreground text-sm font-semibold">
                    Xem trước giao diện Banner
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      adConfig.enabled
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {adConfig.enabled ? 'Đang bật' : 'Đang tắt'}
                  </span>
                </div>

                {adConfig.imageUrl ? (
                  <div className="border-border/80 bg-background group relative overflow-hidden rounded-xl border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={adConfig.imageUrl}
                      alt={adConfig.title || 'Quảng cáo xem trước'}
                      className="max-h-72 w-full bg-black/5 object-contain"
                    />
                    <div className="bg-card border-border border-t p-3">
                      <p className="text-foreground truncate text-xs font-semibold">
                        {adConfig.title || 'Chưa đặt tiêu đề'}
                      </p>
                      {adConfig.linkUrl && (
                        <p className="text-muted-foreground truncate text-[11px]">
                          Đích đến: {adConfig.linkUrl}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border-border/80 bg-muted/20 text-muted-foreground flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center">
                    <ImageIcon className="mb-2 size-10 opacity-40" />
                    <p className="text-xs font-medium">Chưa có ảnh quảng cáo</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      Tải ảnh lên hoặc nhập link ảnh để hiển thị ở đây
                    </p>
                  </div>
                )}

                <div className="bg-muted/40 text-muted-foreground border-border/50 space-y-1.5 rounded-xl border p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span>Thời gian chờ tắt:</span>
                    <strong className="text-foreground">{adConfig.countdownSeconds} giây</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Đối tượng:</span>
                    <span className="text-foreground">
                      {adConfig.targetAudience === 'authenticated' ? 'Đã đăng nhập' : 'Tất cả'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: THÔNG BÁO TÍNH NĂNG & KHUYẾN MÃI (Sản phẩm mới, Voucher...)       */}
      {/* ========================================================================= */}
      {activeTab === 'announcements' && (
        <div className="space-y-8">
          {announceMsg && (
            <div
              className={`flex items-center gap-2.5 rounded-xl border p-4 text-sm ${
                announceMsg.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              {announceMsg.type === 'success' ? (
                <CheckCircle2 className="size-5 shrink-0" />
              ) : (
                <AlertCircle className="size-5 shrink-0" />
              )}
              <p>{announceMsg.text}</p>
            </div>
          )}

          {/* Form thêm thông báo mới */}
          <div className="border-border bg-card space-y-6 rounded-2xl border p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
                  <Plus className="text-primary size-4" />
                  Tạo thông báo tính năng mới
                </h2>
                <p className="text-muted-foreground text-xs">
                  Gửi thông báo tính năng hệ thống như Sản phẩm mới trên Shop, Voucher khuyến mãi,
                  Cập nhật tính năng...
                </p>
              </div>

              {/* Nút điền nhanh mẫu */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs">Mẫu nhanh:</span>
                <button
                  type="button"
                  onClick={() => setSampleData('NEW_PRODUCT')}
                  className="bg-muted text-foreground hover:bg-muted/80 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
                >
                  + Sản phẩm mới
                </button>
                <button
                  type="button"
                  onClick={() => setSampleData('VOUCHER')}
                  className="bg-muted text-foreground hover:bg-muted/80 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
                >
                  + Voucher giảm giá
                </button>
                <button
                  type="button"
                  onClick={() => setSampleData('PRO_VOUCHER')}
                  className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
                >
                  <Crown className="size-3 text-amber-500" />+ Voucher đặc quyền PRO
                </button>
                <button
                  type="button"
                  onClick={() => setSampleData('LUCKY_WHEEL')}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
                >
                  🎡 + Vòng quay may mắn
                </button>
                <button
                  type="button"
                  onClick={() => setSampleData('QUIZ')}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
                >
                  🧠 + Đố vui nhận quà
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-5">
              {/* ĐỐI TƯỢNG NHẬN THÔNG BÁO (ALL VS PRO ONLY) */}
              <div className="border-border/80 bg-muted/20 space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="size-4 text-amber-500" />
                    <span className="text-foreground text-xs font-semibold tracking-wider uppercase">
                      Đối tượng nhận thông báo & Voucher *
                    </span>
                  </div>
                  {newProOnly && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <Crown className="size-3" />
                      Chỉ tài khoản PRO mới thấy
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div
                    onClick={() => setNewProOnly(false)}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                      !newProOnly
                        ? 'border-primary/60 bg-primary/5 ring-primary/40 ring-1'
                        : 'border-border bg-background hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetAudience"
                      checked={!newProOnly}
                      onChange={() => setNewProOnly(false)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <div className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                        <Globe className="text-primary size-3.5" />
                        <span>Tất cả mọi người (Công khai)</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Hiển thị cho tất cả khách ghé thăm website và người dùng thông thường trên
                        banner & chuông thông báo.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setNewProOnly(true);
                      if (!newBadge) setNewBadge('👑 Dành riêng PRO');
                    }}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                      newProOnly
                        ? 'border-amber-500/80 bg-amber-500/10 ring-1 ring-amber-500/40'
                        : 'border-border bg-background hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetAudience"
                      checked={newProOnly}
                      onChange={() => {
                        setNewProOnly(true);
                        if (!newBadge) setNewBadge('👑 Dành riêng PRO');
                      }}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Crown className="size-3.5 text-amber-500" />
                        <span>Dành riêng cho tài khoản PRO (VIP)</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Chỉ các tài khoản <strong>đã đăng ký và còn hạn gói PRO</strong> mới nhìn
                        thấy thông báo & voucher này. Khách thường và khách chưa đăng nhập hoàn toàn
                        không thấy!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                {/* Loại thông báo */}
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Loại thông báo *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as AnnouncementType)}
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  >
                    <option value="NEW_PRODUCT">🛍️ Sản phẩm mới</option>
                    <option value="VOUCHER">🎟️ Ưu đãi Voucher</option>
                    <option value="FEATURE">🚀 Tính năng mới</option>
                    <option value="MAINTENANCE">⚙️ Bảo trì / Cảnh báo</option>
                    <option value="GENERAL">📢 Thông báo chung</option>
                  </select>
                </div>

                {/* Nhãn Badge */}
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Nhãn Badge (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Mới ra mắt, HOT 50%..."
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>

                {/* Tiêu đề */}
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Tiêu đề ngắn *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Ra mắt bộ mã nguồn E-commerce..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Nội dung thông báo tóm tắt */}
              <div className="space-y-1.5">
                <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                  Nội dung tóm tắt (hiển thị trên chuông & banner) *
                </label>
                <textarea
                  rows={2}
                  placeholder="Nhập nội dung ngắn gọn tóm tắt về sản phẩm mới hoặc mã voucher khuyến mãi..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  required
                />
              </div>

              {/* KHU VỰC: CẤU HÌNH VOUCHER & BÀI VIẾT CHI TIẾT */}
              <div className="border-border/80 bg-muted/20 space-y-4 rounded-xl border p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                    <Gift className="size-4 text-rose-500" />
                    <span>Ưu đãi Voucher & Bài viết chi tiết (Tùy chọn)</span>
                  </div>

                  {newProOnly && (
                    <span className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <Crown className="size-3" />
                      Voucher chỉ PRO mới thấy & áp dụng được
                    </span>
                  )}
                </div>

                {/* Chọn nhanh từ danh sách voucher đã tạo trong Shop */}
                {availableCoupons.length > 0 && (
                  <div className="border-primary/20 bg-primary/5 space-y-1.5 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-foreground flex items-center gap-1.5 text-[11px] font-bold">
                        <Tag className="text-primary size-3" />
                        <span>Chọn nhanh từ Voucher đã tạo trong Shop:</span>
                      </label>
                      <span className="text-muted-foreground text-[10px]">
                        ({availableCoupons.length} voucher khả dụng)
                      </span>
                    </div>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleSelectExistingCoupon(e.target.value);
                      }}
                      defaultValue=""
                      className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-lg border px-3 py-1.5 text-xs focus:ring-2 focus:outline-none"
                    >
                      <option value="">-- Bấm để chọn voucher có sẵn trong Shop --</option>
                      {availableCoupons.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.proOnly ? '👑 [CHỈ PRO] ' : '🌐 '}
                          {c.code || c.name} —{' '}
                          {c.type === 'PERCENT'
                            ? `Giảm ${c.value}%`
                            : `Giảm ${c.value.toLocaleString('vi-VN')}đ`}
                          {c.name ? ` (${c.name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                      Mã Voucher (Nếu có)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: GIAM30, FREESHIP, WELCOME2026..."
                      value={newVoucherCode}
                      onChange={(e) => setNewVoucherCode(e.target.value.toUpperCase())}
                      className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 font-mono text-sm focus:ring-2 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                      Mức giảm / Nhãn ưu đãi
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Giảm 30%, 50.000đ, Miễn phí ship..."
                      value={newVoucherDiscount}
                      onChange={(e) => setNewVoucherDiscount(e.target.value)}
                      className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tùy chọn đồng bộ voucher Shop */}
                <div className="flex flex-wrap items-center gap-3 pt-0.5">
                  <label className="text-foreground flex cursor-pointer items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={syncShopCoupon}
                      onChange={(e) => setSyncShopCoupon(e.target.checked)}
                      className="border-input text-primary focus:ring-primary rounded"
                    />
                    <span>
                      Đồng bộ tạo mã này thành Voucher Shop (
                      {newProOnly
                        ? 'được cài đặt chỉ tài khoản PRO mới dùng được'
                        : 'áp dụng được ngay khi mua hàng'}
                      )
                    </span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                        Bài viết chi tiết & Thể lệ thông báo (Trình soạn thảo trực quan như bài
                        viết)
                      </label>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Soạn thảo trực quan với thanh công cụ chèn Bảng biểu, Callout, Hình ảnh,
                        Danh sách...
                      </p>
                    </div>

                    {/* Nút chèn bảng mẫu nhanh */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-foreground mr-1 flex items-center gap-1 text-[11px] font-semibold">
                        <FileSpreadsheet className="text-primary size-3.5" />
                        Chèn bảng mẫu:
                      </span>
                      <button
                        type="button"
                        onClick={() => insertTableTemplate('voucher')}
                        className="bg-muted hover:bg-muted/80 border-border text-foreground flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors"
                        title="Chèn bảng 3 cột: Cấp độ, Mức giảm, Điều kiện"
                      >
                        <TableIcon className="size-3.5 text-rose-500" />+ Bảng điều kiện Voucher
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTableTemplate('prize')}
                        className="bg-muted hover:bg-muted/80 border-border text-foreground flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors"
                        title="Chèn bảng 3 cột: Ô quay, Mã quà, Hạn dùng"
                      >
                        <TableIcon className="size-3.5 text-amber-500" />+ Bảng giải thưởng
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTableTemplate('rules')}
                        className="bg-muted hover:bg-muted/80 border-border text-foreground flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors"
                        title="Chèn bảng 2 cột: Tiêu chí, Quy định"
                      >
                        <TableIcon className="size-3.5 text-blue-500" />+ Bảng thể lệ
                      </button>
                    </div>
                  </div>

                  {/* Trình soạn thảo RichTextEditor chuẩn giống như ở bài viết */}
                  <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
                    <RichTextEditor
                      value={newDetailContent}
                      onChange={setNewDetailContent}
                      placeholder="Nhập nội dung bài viết chi tiết, bấm nút Bảng biểu ở thanh công cụ bên trái hoặc nút chèn bảng ở trên để tạo bảng..."
                    />
                  </div>
                </div>
              </div>

              {/* KHU VỰC: TÍCH HỢP MINI GAME */}
              <div className="border-border/80 space-y-5 rounded-xl border bg-amber-500/5 p-4 sm:p-5 dark:bg-amber-500/10">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                  <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                    <Gamepad2 className="size-4 text-amber-500" />
                    <span>Tích hợp Mini Game vào bài viết thông báo</span>
                  </div>
                  <span className="text-muted-foreground text-xs">Tăng tương tác người dùng</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Chọn loại Mini Game
                  </label>
                  <select
                    value={newGameType}
                    onChange={(e) =>
                      setNewGameType(e.target.value as 'NONE' | 'LUCKY_WHEEL' | 'QUIZ')
                    }
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none sm:w-80"
                  >
                    <option value="NONE">❌ Không kèm Mini Game</option>
                    <option value="LUCKY_WHEEL">
                      🎡 Vòng quay may mắn (Tự điền 10%, 10k, 20%, 50k...)
                    </option>
                    <option value="QUIZ">
                      🧠 Trả lời câu hỏi trúng thưởng (Tự điền câu hỏi & đáp án)
                    </option>
                  </select>
                </div>

                {/* CẤU HÌNH VÒNG QUAY MAY MẮN (ĐIỀN TỪNG Ô) */}
                {newGameType === 'LUCKY_WHEEL' && (
                  <div className="space-y-4 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold sm:text-sm">
                          <Sparkles className="size-4 text-amber-500" />
                          Cấu hình các ô trên Vòng quay ({wheelSegments.length} ô)
                        </h4>
                        <p className="text-muted-foreground text-xs">
                          Bạn có thể tự nhập chữ cho từng ô (vd: 10%, 10k, 50k, Freeship...) và mã
                          quà tương ứng.
                        </p>
                      </div>

                      {/* Nút mẫu vòng quay nhanh */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-muted-foreground text-[11px]">Mẫu sẵn:</span>
                        <button
                          type="button"
                          onClick={() => setWheelPreset('mixed')}
                          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                        >
                          Đa dạng (10%, 10k, 20%, 50k...)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWheelPreset('percent')}
                          className="border-border bg-muted text-foreground hover:bg-muted/80 rounded-md border px-2 py-0.5 text-[11px] font-medium"
                        >
                          Toàn % (5%, 10%, 20%...)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWheelPreset('cash')}
                          className="border-border bg-muted text-foreground hover:bg-muted/80 rounded-md border px-2 py-0.5 text-[11px] font-medium"
                        >
                          Tiền mặt (10k, 20k, 50k...)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
                      {/* Bảng danh sách ô */}
                      <div className="space-y-2 lg:col-span-8">
                        <div className="border-border bg-background overflow-hidden rounded-xl border">
                          <div className="bg-muted/60 text-muted-foreground grid grid-cols-12 gap-2 border-b p-2.5 text-[11px] font-bold tracking-wider uppercase">
                            <span className="col-span-1 text-center">#</span>
                            <span className="col-span-4">Chữ trên ô (10%, 10k...)</span>
                            <span className="col-span-3">Mã Voucher trao</span>
                            <span className="col-span-2 text-center">Trúng thưởng</span>
                            <span className="col-span-1 text-center">Màu</span>
                            <span className="col-span-1 text-center">Xóa</span>
                          </div>

                          <div className="divide-border/60 max-h-80 divide-y overflow-y-auto">
                            {wheelSegments.map((seg, idx) => (
                              <div
                                key={seg.id}
                                className="hover:bg-muted/20 grid grid-cols-12 items-center gap-2 p-2 text-xs"
                              >
                                <span className="text-muted-foreground col-span-1 text-center font-bold">
                                  {idx + 1}
                                </span>
                                <div className="col-span-4">
                                  <input
                                    type="text"
                                    placeholder="10%, 10k, Freeship..."
                                    value={seg.label}
                                    onChange={(e) =>
                                      handleUpdateWheelSegment(seg.id, 'label', e.target.value)
                                    }
                                    className="border-input bg-background focus:ring-primary w-full rounded-md border px-2.5 py-1 text-xs font-semibold focus:ring-1 focus:outline-none"
                                  />
                                </div>
                                <div className="col-span-3">
                                  <input
                                    type="text"
                                    placeholder={newVoucherCode || 'Mã riêng...'}
                                    value={seg.code}
                                    onChange={(e) =>
                                      handleUpdateWheelSegment(
                                        seg.id,
                                        'code',
                                        e.target.value.toUpperCase(),
                                      )
                                    }
                                    className="border-input bg-background focus:ring-primary w-full rounded-md border px-2 py-1 font-mono text-[11px] focus:ring-1 focus:outline-none"
                                  />
                                </div>
                                <div className="col-span-2 text-center">
                                  <label className="inline-flex cursor-pointer items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={seg.isWin !== false}
                                      onChange={(e) =>
                                        handleUpdateWheelSegment(seg.id, 'isWin', e.target.checked)
                                      }
                                      className="border-input text-primary rounded"
                                    />
                                    <span
                                      className={`text-[10px] font-medium ${
                                        seg.isWin !== false
                                          ? 'text-emerald-600'
                                          : 'text-muted-foreground'
                                      }`}
                                    >
                                      {seg.isWin !== false ? 'Trúng' : 'Trượt'}
                                    </span>
                                  </label>
                                </div>
                                <div className="col-span-1 flex justify-center">
                                  <input
                                    type="color"
                                    value={seg.color}
                                    onChange={(e) =>
                                      handleUpdateWheelSegment(seg.id, 'color', e.target.value)
                                    }
                                    className="border-border bg-background size-7 cursor-pointer rounded border p-0.5"
                                    title="Chọn màu sắc cho ô này"
                                  />
                                </div>
                                <div className="col-span-1 flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveWheelSegment(seg.id)}
                                    className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
                                    title="Xóa ô này"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddWheelSegment}
                          className="border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-semibold transition-colors"
                        >
                          <Plus className="size-3.5" />
                          <span>+ Thêm ô thưởng mới</span>
                        </button>
                      </div>

                      {/* Mini Live Preview của Vòng quay */}
                      <div className="border-border bg-card space-y-2 rounded-xl border p-3.5 text-center lg:col-span-4">
                        <div className="text-muted-foreground flex items-center justify-center gap-1 text-[11px] font-bold tracking-wider uppercase">
                          <Eye className="size-3 text-amber-500" />
                          <span>Mô phỏng vòng quay ({wheelSegments.length} ô):</span>
                        </div>
                        <div className="relative mx-auto size-44 overflow-hidden rounded-full border-4 border-amber-400 shadow-md">
                          <svg viewBox="0 0 100 100" className="size-full">
                            {wheelSegments.map((seg, i) => {
                              const n = wheelSegments.length;
                              const deg = 360 / n;
                              const startAngle = i * deg;
                              const endAngle = (i + 1) * deg;
                              const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                              const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                              const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                              const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);
                              const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
                              const midAngle = startAngle + deg / 2 - 90;
                              const textX = 50 + 32 * Math.cos((Math.PI * midAngle) / 180);
                              const textY = 50 + 32 * Math.sin((Math.PI * midAngle) / 180);
                              const isLong = seg.label.length > 5;
                              const fontSize = isLong ? 3 : n > 8 ? 3.5 : 4.5;
                              return (
                                <g key={i}>
                                  <path
                                    d={pathData}
                                    fill={seg.color}
                                    stroke="#ffffff"
                                    strokeWidth="0.5"
                                  />
                                  <text
                                    x={textX}
                                    y={textY}
                                    fill="#ffffff"
                                    fontSize={fontSize}
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                                  >
                                    {seg.label}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex size-8 items-center justify-center rounded-full border border-white bg-amber-400 text-[8px] font-black text-amber-950">
                              QUAY
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-[10px]">
                          Chữ và màu sắc trên vòng quay sẽ hiển thị chính xác như trên khi người
                          dùng mở thông báo.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CẤU HÌNH ĐỐ VUI TRẮC NGHIỆM */}
                {newGameType === 'QUIZ' && (
                  <div className="space-y-4 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold sm:text-sm">
                          <HelpCircle className="size-4 text-blue-500" />
                          Cấu hình câu hỏi & các đáp án trắc nghiệm
                        </h4>
                        <p className="text-muted-foreground text-xs">
                          Nhập nội dung câu hỏi, điền các đáp án và chọn đáp án chính xác để trao
                          thưởng.
                        </p>
                      </div>

                      {/* Mẫu câu hỏi nhanh */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-muted-foreground text-[11px]">Mẫu câu hỏi:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setQuizQuestion(
                              'Framework CSS nào sử dụng triết lý utility-first phổ biến nhất hiện nay trong hệ sinh thái Next.js/React?',
                            );
                            setQuizOptions(['Bootstrap', 'Tailwind CSS', 'Ant Design', 'Bulma']);
                            setQuizCorrectIndex(1);
                          }}
                          className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-500/20 dark:text-blue-300"
                        >
                          CSS / Tailwind
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuizQuestion(
                              'Trong Next.js 15 App Router, mặc định các component trong thư mục app/ là loại component nào?',
                            );
                            setQuizOptions([
                              'Server Component (RSC)',
                              'Client Component (use client)',
                              'Static HTML Template',
                              'Web Component',
                            ]);
                            setQuizCorrectIndex(0);
                          }}
                          className="border-border bg-muted text-foreground hover:bg-muted/80 rounded-md border px-2 py-0.5 text-[11px] font-medium"
                        >
                          Next.js 15 RSC
                        </button>
                      </div>
                    </div>

                    {/* Ô nhập câu hỏi */}
                    <div className="space-y-1.5">
                      <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                        Nội dung câu hỏi đố vui *
                      </label>
                      <textarea
                        rows={2}
                        placeholder="VD: Ngôn ngữ lập trình nào được sử dụng phổ biến nhất cho phát triển Web Frontend?"
                        value={quizQuestion}
                        onChange={(e) => setQuizQuestion(e.target.value)}
                        className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border p-3 text-sm focus:ring-2 focus:outline-none"
                        required={newGameType === 'QUIZ'}
                      />
                    </div>

                    {/* Danh sách các đáp án A, B, C, D... */}
                    <div className="space-y-2">
                      <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                        Các lựa chọn đáp án (Tích chọn đáp án đúng nhất) *
                      </label>

                      <div className="space-y-2">
                        {quizOptions.map((opt, idx) => {
                          const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                          const isCorrect = quizCorrectIndex === idx;
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-2.5 rounded-xl border p-2 transition-colors sm:p-2.5 ${
                                isCorrect
                                  ? 'border-emerald-500/60 bg-emerald-500/10'
                                  : 'border-border bg-background'
                              }`}
                            >
                              <span className="bg-muted text-foreground flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black">
                                {letters[idx] || idx + 1}
                              </span>

                              <input
                                type="text"
                                placeholder={`Nhập nội dung đáp án ${letters[idx]}...`}
                                value={opt}
                                onChange={(e) => handleUpdateQuizOption(idx, e.target.value)}
                                className="text-foreground flex-1 bg-transparent text-sm focus:outline-none"
                              />

                              <label className="flex shrink-0 cursor-pointer items-center gap-1.5">
                                <input
                                  type="radio"
                                  name="quizCorrect"
                                  checked={isCorrect}
                                  onChange={() => setQuizCorrectIndex(idx)}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span
                                  className={`text-xs font-bold ${
                                    isCorrect
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  {isCorrect ? '✓ ĐÁP ÁN ĐÚNG' : 'Chọn đáp án đúng'}
                                </span>
                              </label>

                              {quizOptions.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQuizOption(idx)}
                                  className="text-muted-foreground hover:text-destructive rounded p-1"
                                  title="Xóa đáp án này"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleAddQuizOption}
                          disabled={quizOptions.length >= 6}
                          className="border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <Plus className="size-3.5" />
                          <span>+ Thêm lựa chọn đáp án</span>
                        </button>
                        <span className="text-muted-foreground text-xs">
                          Người chơi chọn đúng đáp án{' '}
                          <strong>{['A', 'B', 'C', 'D', 'E', 'F'][quizCorrectIndex]}</strong> sẽ
                          nhận được Voucher!
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                {/* Link URL */}
                <div className="space-y-1.5 sm:col-span-8">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Đường dẫn liên kết (Link đích khi bấm)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: /shop, /courses hoặc /vouchers"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>

                {/* Link Text */}
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Chữ trên nút bấm
                  </label>
                  <input
                    type="text"
                    placeholder="Xem ngay / Khám phá ngay"
                    value={newLinkText}
                    onChange={(e) => setNewLinkText(e.target.value)}
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tùy chọn hiển thị */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="text-foreground flex cursor-pointer items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    className="border-input text-primary focus:ring-primary rounded"
                  />
                  <span>Kích hoạt ngay (Active)</span>
                </label>

                <label className="text-foreground flex cursor-pointer items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={newShowBanner}
                    onChange={(e) => setNewShowBanner(e.target.checked)}
                    className="border-input text-primary focus:ring-primary rounded"
                  />
                  <span>Ghim hiển thị lên thanh Top Banner đầu trang</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreatingAnnounce}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isCreatingAnnounce ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  <span>{isCreatingAnnounce ? 'Đang tạo...' : 'Tạo thông báo'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Danh sách thông báo */}
          <div className="border-border bg-card space-y-4 rounded-2xl border p-6 shadow-sm">
            <h2 className="text-foreground flex items-center justify-between text-base font-semibold">
              <span>Danh sách thông báo hệ thống ({announcements.length})</span>
            </h2>

            {announcements.length === 0 ? (
              <div className="border-border/80 rounded-xl border border-dashed py-10 text-center">
                <Radio className="text-muted-foreground mx-auto mb-2 size-8 opacity-40" />
                <p className="text-muted-foreground text-sm font-medium">Chưa có thông báo nào.</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Dùng form bên trên hoặc bấm &quot;Mẫu nhanh&quot; để tạo thông báo đầu tiên.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((item) => (
                  <div
                    key={item.id}
                    className="border-border/70 bg-background/50 hover:border-border flex flex-col justify-between gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            item.type === 'NEW_PRODUCT'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : item.type === 'VOUCHER'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {item.type === 'NEW_PRODUCT' && <Package className="size-3" />}
                          {item.type === 'VOUCHER' && <Tag className="size-3" />}
                          {item.type === 'FEATURE' && <Rocket className="size-3" />}
                          {item.type === 'MAINTENANCE' && <Info className="size-3" />}
                          <span>{item.badge || item.type}</span>
                        </span>

                        <h3 className="text-foreground truncate text-sm font-semibold">
                          {item.title}
                        </h3>

                        {item.voucherCode && (
                          <span className="inline-flex items-center gap-1 rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            <Gift className="size-3" />
                            {item.voucherCode}{' '}
                            {item.voucherDiscount ? `(${item.voucherDiscount})` : ''}
                          </span>
                        )}

                        {item.gameType && (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <Gamepad2 className="size-3" />
                            {item.gameType === 'LUCKY_WHEEL' ? 'Vòng quay' : 'Trắc nghiệm'}
                          </span>
                        )}

                        {item.showBanner && (
                          <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                            Ghim Top Banner
                          </span>
                        )}

                        {item.proOnly ? (
                          <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 shadow-xs dark:text-amber-400">
                            <Crown className="size-3 text-amber-500" />
                            Đặc quyền PRO
                          </span>
                        ) : (
                          <span className="bg-muted text-muted-foreground border-border flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                            <Globe className="size-3" />
                            Công khai
                          </span>
                        )}
                      </div>

                      <p className="text-muted-foreground line-clamp-2 text-xs">{item.content}</p>

                      {item.linkUrl && (
                        <div className="text-primary flex items-center gap-1 text-[11px]">
                          <ExternalLink className="size-3" />
                          <Link href={item.linkUrl} target="_blank" className="hover:underline">
                            {item.linkUrl} ({item.linkText || 'Xem ngay'})
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Toggles & Nút xóa & Nút xem trước */}
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setSelectedAnnouncementForPreview(item)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
                        title="Xem bài viết & chơi thử Mini Game"
                      >
                        <Eye className="size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggle(item.id, 'proOnly')}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          item.proOnly
                            ? 'border border-amber-500/40 bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 dark:text-amber-300'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                        title="Chuyển chế độ: Chỉ tài khoản PRO mới thấy hay Tất cả mọi người"
                      >
                        <Crown className="size-3" />
                        {item.proOnly ? 'Chỉ PRO' : 'Tất cả'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggle(item.id, 'isActive')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          item.isActive
                            ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                        title="Bật/Tắt kích hoạt"
                      >
                        {item.isActive ? 'Đang bật' : 'Đang ẩn'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggle(item.id, 'showBanner')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          item.showBanner
                            ? 'bg-primary/15 text-primary hover:bg-primary/25'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                        title="Bật/Tắt ghim banner đầu trang"
                      >
                        {item.showBanner ? 'Banner: Bật' : 'Banner: Tắt'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg p-1.5 transition-colors"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PREVIEW QUẢNG CÁO (5s Countdown)                                    */}
      {/* ========================================================================= */}
      {previewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && previewCanClose) {
              closePreview();
            }
          }}
        >
          <div className="animate-in zoom-in-95 relative w-full max-w-xl duration-200">
            <div className="bg-card border-border/80 relative overflow-hidden rounded-2xl border shadow-2xl">
              {/* Nút đếm ngược hoặc Nút tắt X */}
              <div className="absolute top-3 right-3 z-30">
                {!previewCanClose ? (
                  <div className="flex animate-pulse items-center gap-1.5 rounded-full border border-white/20 bg-black/75 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-md select-none">
                    <span className="inline-block size-2 rounded-full bg-amber-400" />
                    <span>Đóng sau {previewCountdown}s</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={closePreview}
                    aria-label="Đóng xem trước"
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/30 bg-black/80 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-transform hover:scale-105 hover:bg-black active:scale-95"
                  >
                    <span>Bỏ qua</span>
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Badge nhãn */}
              <div className="absolute top-3 left-3 z-20">
                <span className="bg-primary/90 text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow backdrop-blur-md">
                  <Sparkles className="size-3" />
                  Chế độ Xem trước
                </span>
              </div>

              {/* Ảnh quảng cáo */}
              <div className="relative overflow-hidden bg-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={adConfig.imageUrl}
                  alt={adConfig.title || 'Quảng cáo'}
                  className="max-h-[70vh] w-full object-contain sm:max-h-[500px] sm:object-cover"
                />
              </div>

              {/* Chân mô tả */}
              {(adConfig.title || adConfig.linkUrl) && (
                <div className="bg-background/95 border-border flex flex-col items-center justify-between gap-3 border-t p-4 backdrop-blur-sm sm:flex-row">
                  <div className="text-center sm:text-left">
                    <h3 className="text-foreground line-clamp-1 text-sm font-semibold">
                      {adConfig.title || 'Ưu đãi đặc biệt'}
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      Bấm vào ảnh để chuyển hướng tới trang đích
                    </p>
                  </div>
                  {adConfig.linkUrl && (
                    <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-sm">
                      <span>Xem chi tiết</span>
                      <ExternalLink className="size-3.5" />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal xem trước bài viết chi tiết / Chơi thử game */}
      <AnnouncementDetailModal
        announcement={selectedAnnouncementForPreview}
        open={!!selectedAnnouncementForPreview}
        onClose={() => setSelectedAnnouncementForPreview(null)}
      />
    </div>
  );
}
