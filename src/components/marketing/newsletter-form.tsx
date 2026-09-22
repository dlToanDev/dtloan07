'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

interface NewsletterFormProps {
  source?: string;
  leadTitle?: string;
  buttonText?: string;
  placeholder?: string;
  className?: string;
}

export function NewsletterForm({
  source = 'newsletter-inline',
  leadTitle = 'Bản tin lập trình & hệ thống',
  buttonText = 'Đăng ký nhận tin',
  placeholder = 'Nhập email của bạn...',
  className = '',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field (hidden)
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
          leadTitle,
          website, // honeypot
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'Cảm ơn bạn đã đăng ký!');
        setEmail('');
        if (typeof window !== 'undefined') {
          localStorage.setItem('lead_magnet_subscribed', 'true');
        }
      } else {
        setError(data.error || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } catch {
      setError('Lỗi kết nối tới máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p>{success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${className}`}>
      {/* Honeypot field ẩn chống bot tự động */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="bg-background h-11"
        />
        <Button type="submit" disabled={loading} className="h-11 shrink-0 px-6 font-medium">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang gửi...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {buttonText}
            </>
          )}
        </Button>
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </form>
  );
}
