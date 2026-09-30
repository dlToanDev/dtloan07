'use client';

import { useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Account {
  label: string;
  credentials: string;
}

/**
 * Nút xem thông tin tài khoản đã mua.
 * Server chỉ trả nội dung khi đúng chủ đơn (hoặc đúng mã đơn + email),
 * và mỗi lần xem đều được ghi nhật ký.
 */
export function AccountCredentialsButton({
  orderItemId,
  orderCode,
  email,
}: {
  orderItemId: string;
  orderCode?: string;
  email?: string;
}) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orders/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemId, orderCode, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Không xem được thông tin tài khoản.');
        return;
      }
      setAccounts(data.data.accounts);
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (accounts) {
    return (
      <div className="space-y-2">
        {accounts.map((account, index) => (
          <pre
            key={`${account.label}-${index}`}
            className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs break-all whitespace-pre-wrap"
          >
            {account.credentials}
          </pre>
        ))}
        <p className="text-muted-foreground text-xs">
          Vui lòng lưu lại thông tin và không chia sẻ cho người khác.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <Eye className="mr-1.5 size-3.5" />
        )}
        Xem thông tin tài khoản
      </Button>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
