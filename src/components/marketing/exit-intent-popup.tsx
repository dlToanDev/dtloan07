'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { NewsletterForm } from './newsletter-form';
import { Gift } from 'lucide-react';

const DISMISSED_KEY = 'exit_intent_dismissed_at';
const SUBSCRIBED_KEY = 'lead_magnet_subscribed';
const COOLDOWN_DAYS = 7;

export function ExitIntentPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Không hiện nếu đã đăng ký hoặc đã tắt trong vòng 7 ngày
    const isSubscribed = localStorage.getItem(SUBSCRIBED_KEY);
    if (isSubscribed === 'true') return;

    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < COOLDOWN_DAYS) return;
    }

    let hasTriggered = false;

    const handleMouseLeave = (e: MouseEvent) => {
      // Khi chuột di chuyển lên mép trên cửa sổ trình duyệt
      if (e.clientY <= 10 && !hasTriggered) {
        hasTriggered = true;
        setOpen(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Quà tặng kỹ thuật miễn phí"
      description="Đừng bỏ lỡ tài liệu tổng hợp kiến trúc server và DevOps thực chiến."
    >
      <div className="space-y-4">
        <div className="border-primary/20 bg-primary/5 flex items-center gap-3 rounded-lg border p-3 text-sm">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <p className="text-foreground font-semibold">Ebook: Tối Ưu Nginx & VPS Production</p>
            <p className="text-muted-foreground text-xs">
              Checklist 30 mục bảo mật, chống DDoS và tăng tốc độ tải trang lên 300%.
            </p>
          </div>
        </div>

        <NewsletterForm
          source="exit-intent-popup"
          leadTitle="Ebook Tối Ưu Nginx & VPS Production"
          buttonText="Nhận ngay"
          placeholder="Địa chỉ email của bạn..."
        />
      </div>
    </Dialog>
  );
}
