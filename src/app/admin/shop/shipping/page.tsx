import { db } from '@/lib/db';
import { requireProductAdmin } from '@/server/actions/product';
import { ShippingZoneManager, type ZoneView } from '@/components/admin/shop/shipping-zone-manager';

export const dynamic = 'force-dynamic';

export default async function ShippingZonesPage() {
  await requireProductAdmin();

  let zones: ZoneView[] = [];
  try {
    zones = await db.shippingZone.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        provinces: true,
        feeVnd: true,
        freeShipFromVnd: true,
        isDefault: true,
        sortOrder: true,
      },
    });
  } catch (err) {
    console.warn('Lỗi tải khu vực ship:', err);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Phí ship theo khu vực</h1>
        <p className="text-muted-foreground text-sm">
          Khi khách chọn tỉnh ở bước thanh toán, hệ thống lấy khu vực chứa tỉnh đó có thứ tự ưu tiên
          nhỏ nhất. Tỉnh không thuộc khu nào sẽ dùng khu mặc định.
        </p>
      </div>

      <ShippingZoneManager zones={zones} />
    </div>
  );
}
