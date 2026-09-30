import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), sign: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { product: { findUnique: mocks.findUnique } } }));
vi.mock('@/lib/storage', () => ({ isR2Configured: true, getSignedDownloadUrl: mocks.sign }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.limit }));
import { GET } from '@/app/api/products/[productId]/download/route';

const product = {
  status: 'ACTIVE',
  saleMode: 'FREE',
  priceVnd: 0,
  slug: 'demo',
  files: [{ id: 'file-1', storageKey: 'private/key', filename: 'source.tar.gz' }],
};
const request = (query = '') =>
  GET(new NextRequest(`https://example.com/api/products/p1/download${query}`), {
    params: Promise.resolve({ productId: 'p1' }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockReturnValue({ success: true });
  mocks.findUnique.mockResolvedValue(product);
  mocks.sign.mockResolvedValue('https://storage.example.com/signed');
});
describe('Free product download route', () => {
  it('allows an anonymous free download and preserves the filename', async () => {
    const response = await request();
    expect(response.status).toBe(302);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.sign).toHaveBeenCalledWith({
      storageKey: 'private/key',
      filename: 'source.tar.gz',
    });
  });
  it.each([
    { saleMode: 'PAID', priceVnd: 1000 },
    { saleMode: 'CONTACT' },
    { status: 'DRAFT' },
    { priceVnd: 1000 },
  ])('denies restricted product %j', async (override) => {
    mocks.findUnique.mockResolvedValue({ ...product, ...override });
    expect((await request()).status).toBe(403);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it('does not fall back to another file for an invalid file ID', async () => {
    expect((await request('?fileId=another-products-file')).status).toBe(404);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it('limits repeated download requests', async () => {
    mocks.limit.mockReturnValue({ success: false });
    expect((await request()).status).toBe(429);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
