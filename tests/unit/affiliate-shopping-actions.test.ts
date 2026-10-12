import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { createAffiliateItem, uploadAffiliateImage } from '@/server/actions/affiliate';

// Mock requireAdmin and revalidatePath
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'admin-1', role: 'ADMIN', email: 'admin@blog.com' },
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Affiliate Shopping Actions Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('tạo mới sản phẩm affiliate với subCategory và platform thành công', async () => {
    const mockCreatedItem = {
      id: 'aff-item-1',
      name: 'Bàn phím cơ Aula F75',
      slug: 'ban-phim-co-aula-f75',
      category: 'SHOPEE',
      subCategory: 'Bàn phím',
      platform: 'Shopee',
      description: 'Bàn phím cơ 3 mode',
      perks: 'Bảo hành 12 tháng',
      couponCode: 'AULA10',
      directUrl: 'https://shopee.vn/product/123',
      shortenedUrl: 'https://link4m.org/abc',
      activeUrlType: 'SHORTENED',
      logoUrl: '/images/affiliates/aula.png',
      featured: true,
      active: true,
    };

    vi.spyOn(db.affiliateItem, 'findUnique').mockResolvedValue(null);
    const createSpy = vi
      .spyOn(db.affiliateItem, 'create')
      .mockResolvedValue(mockCreatedItem as never);

    const formData = new FormData();
    formData.append('name', 'Bàn phím cơ Aula F75');
    formData.append('slug', '');
    formData.append('category', 'SHOPEE');
    formData.append('platform', 'Shopee');
    formData.append('subCategory', 'Bàn phím');
    formData.append('description', 'Bàn phím cơ 3 mode');
    formData.append('perks', 'Bảo hành 12 tháng');
    formData.append('couponCode', 'AULA10');
    formData.append('directUrl', 'https://shopee.vn/product/123');
    formData.append('shortenedUrl', 'https://link4m.org/abc');
    formData.append('activeUrlType', 'SHORTENED');
    formData.append('logoUrl', '/images/affiliates/aula.png');
    formData.append('featured', 'true');
    formData.append('active', 'true');

    await createAffiliateItem(formData);

    expect(createSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Bàn phím cơ Aula F75',
        slug: 'ban-phim-co-aula-f75',
        category: 'SHOPEE',
        platform: 'Shopee',
        subCategory: 'Bàn phím',
        directUrl: 'https://shopee.vn/product/123',
        shortenedUrl: 'https://link4m.org/abc',
        activeUrlType: 'SHORTENED',
        featured: true,
        active: true,
      }),
    });
  });

  it('tự động xử lý xung đột slug khi slug đã tồn tại', async () => {
    // Lần đầu findUnique thấy slug đã tồn tại, lần 2 không tồn tại
    vi.spyOn(db.affiliateItem, 'findUnique')
      .mockResolvedValueOnce({ id: 'existing-1', slug: 'ao-thun-nam' } as never)
      .mockResolvedValueOnce(null);

    const createSpy = vi.spyOn(db.affiliateItem, 'create').mockResolvedValue({} as never);

    const formData = new FormData();
    formData.append('name', 'Áo thun nam');
    formData.append('directUrl', 'https://shopee.vn/ao-thun');

    await createAffiliateItem(formData);

    expect(createSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: 'ao-thun-nam-1',
      }),
    });
  });

  it('uploadAffiliateImage từ chối định dạng file không hợp lệ', async () => {
    const invalidFile = new File(['fake-exe-content'], 'malware.exe', {
      type: 'application/x-msdownload',
    });
    const formData = new FormData();
    formData.append('file', invalidFile);

    const res = await uploadAffiliateImage(formData);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Chỉ chấp nhận các định dạng ảnh');
  });
});
