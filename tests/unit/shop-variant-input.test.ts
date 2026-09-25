import { describe, it, expect } from 'vitest';
import { parseVariantsInput, planVariantSync } from '@/lib/shop/variant-input';

describe('parseVariantsInput', () => {
  it('parse JSON hợp lệ, chuẩn hóa chuỗi rỗng thành null', () => {
    const result = parseVariantsInput(
      JSON.stringify([
        { name: ' Đen / M ', sku: '', priceVnd: 150000, compareAtVnd: '', stock: '', active: true },
      ]),
    );
    expect(result).toEqual({
      ok: true,
      variants: [
        {
          name: 'Đen / M',
          sku: null,
          priceVnd: 150000,
          compareAtVnd: null,
          stock: null,
          active: true,
        },
      ],
    });
  });

  it('từ chối rỗng, tên trùng, giá âm, stock âm, JSON hỏng', () => {
    expect(parseVariantsInput('[]').ok).toBe(false);
    expect(
      parseVariantsInput(
        JSON.stringify([
          { name: 'M', priceVnd: 1, active: true },
          { name: 'm', priceVnd: 1, active: true },
        ]),
      ),
    ).toEqual({ ok: false, error: 'Tên biến thể bị trùng: "m".' });
    expect(parseVariantsInput(JSON.stringify([{ name: 'M', priceVnd: -1, active: true }])).ok).toBe(
      false,
    );
    expect(
      parseVariantsInput(JSON.stringify([{ name: 'M', priceVnd: 1, stock: -2, active: true }])).ok,
    ).toBe(false);
    expect(parseVariantsInput('{bad').ok).toBe(false);
    expect(parseVariantsInput(null).ok).toBe(false);
  });

  it('từ chối giá gạch nhỏ hơn hoặc bằng giá bán', () => {
    const result = parseVariantsInput(
      JSON.stringify([{ name: 'M', priceVnd: 100, compareAtVnd: 100, active: true }]),
    );
    expect(result.ok).toBe(false);
  });
});

describe('planVariantSync', () => {
  const base = { sku: null, priceVnd: 1, compareAtVnd: null, stock: null, active: true };

  it('tạo mới dòng không có id, cập nhật dòng có id, gán sortOrder theo thứ tự', () => {
    const plan = planVariantSync(
      [{ id: 'a', hasOrders: false }],
      [
        { ...base, name: 'Mới' },
        { ...base, id: 'a', name: 'Cũ' },
      ],
    );
    expect(plan.create).toEqual([{ ...base, name: 'Mới', sortOrder: 0 }]);
    expect(plan.update).toEqual([{ ...base, id: 'a', name: 'Cũ', sortOrder: 1 }]);
    expect(plan.remove).toEqual([]);
    expect(plan.deactivate).toEqual([]);
  });

  it('biến thể bị bỏ khỏi form: có đơn → deactivate, chưa có đơn → remove', () => {
    const plan = planVariantSync(
      [
        { id: 'sold', hasOrders: true },
        { id: 'fresh', hasOrders: false },
      ],
      [{ ...base, name: 'Khác' }],
    );
    expect(plan.deactivate).toEqual(['sold']);
    expect(plan.remove).toEqual(['fresh']);
  });

  it('id lạ (không thuộc sản phẩm) được coi như tạo mới', () => {
    const plan = planVariantSync([], [{ ...base, id: 'foreign', name: 'X' }]);
    expect(plan.update).toEqual([]);
    expect(plan.create[0]).toEqual({ ...base, name: 'X', sortOrder: 0 });
  });
});
