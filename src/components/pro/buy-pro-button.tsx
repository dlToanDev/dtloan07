'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MembershipPlanValue } from '@/lib/membership';

export function BuyProButton({
  plan,
  label,
  highlight = false,
}: {
  plan: MembershipPlanValue;
  label: string;
  highlight?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const buy = async () => {
    setPending(true);
    setError('');
    try {
      const res = await fetch('/api/pro/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error || 'Không tạo được thanh toán. Vui lòng thử lại.');
        setPending(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={buy}
        disabled={pending}
        variant={highlight ? 'primary' : 'outline'}
        className="w-full"
      >
        {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        {label}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-rose-500">
          {error}
        </p>
      )}
    </div>
  );
}
