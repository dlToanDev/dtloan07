import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/go/[slug]/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    affiliateItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Affiliate Go Route (src/app/go/[slug]/route.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Chuyển hướng thẳng tới directUrl khi deal có activeUrlType là DIRECT (không dùng rút gọn)', async () => {
    vi.mocked(db.affiliateItem.findUnique).mockResolvedValue({
      id: 'deal-1',
      directUrl: 'https://shopee.vn/product-123',
      shortenedUrl: 'https://link4m.net/xyz',
      activeUrlType: 'DIRECT',
    } as never);
    vi.mocked(db.affiliateItem.update).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost:3000/go/deal-1');
    const res = await GET(req, { params: Promise.resolve({ slug: 'deal-1' }) });

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://shopee.vn/product-123');
  });

  it('2. Chuyển hướng tới shortenedUrl khi deal cấu hình SHORTENED', async () => {
    vi.mocked(db.affiliateItem.findUnique).mockResolvedValue({
      id: 'deal-2',
      directUrl: 'https://shopee.vn/product-456',
      shortenedUrl: 'https://link4m.net/xyz456',
      activeUrlType: 'SHORTENED',
    } as never);
    vi.mocked(db.affiliateItem.update).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost:3000/go/deal-2');
    const res = await GET(req, { params: Promise.resolve({ slug: 'deal-2' }) });

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://link4m.net/xyz456');
  });

  it('3. Bỏ qua link rút gọn và đi thẳng tới directUrl khi có tham số ?direct=1', async () => {
    vi.mocked(db.affiliateItem.findUnique).mockResolvedValue({
      id: 'deal-3',
      directUrl: 'https://shopee.vn/product-789',
      shortenedUrl: 'https://link4m.net/money789',
      activeUrlType: 'SHORTENED',
    } as never);
    vi.mocked(db.affiliateItem.update).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost:3000/go/deal-3?direct=1');
    const res = await GET(req, { params: Promise.resolve({ slug: 'deal-3' }) });

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://shopee.vn/product-789');
  });

  it('4. Tự động fallback về directUrl nếu deal chọn SHORTENED nhưng shortenedUrl để trống', async () => {
    vi.mocked(db.affiliateItem.findUnique).mockResolvedValue({
      id: 'deal-4',
      directUrl: 'https://tiktok.com/@shop/item',
      shortenedUrl: null,
      activeUrlType: 'SHORTENED',
    } as never);
    vi.mocked(db.affiliateItem.update).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost:3000/go/deal-4');
    const res = await GET(req, { params: Promise.resolve({ slug: 'deal-4' }) });

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://tiktok.com/@shop/item');
  });
});
