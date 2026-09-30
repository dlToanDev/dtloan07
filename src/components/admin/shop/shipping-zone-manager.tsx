'use client';

import { useActionState, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PROVINCES } from '@/config/provinces';
import {
  deleteShippingZone,
  saveShippingZone,
  type ShippingZoneState,
} from '@/server/actions/shipping';

export interface ZoneView {
  id: string;
  name: string;
  provinces: string[];
  feeVnd: number;
  freeShipFromVnd: number | null;
  isDefault: boolean;
  sortOrder: number;
}

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2 text-sm';
const initialState: ShippingZoneState = {};

function ZoneForm({ zone, zones }: { zone?: ZoneView; zones: ZoneView[] }) {
  const [state, action, pending] = useActionState(saveShippingZone, initialState);
  const [selected, setSelected] = useState<string[]>(zone?.provinces ?? []);
  const isDefault = Boolean(zone?.isDefault);

  // Tỉnh đang thuộc khu khác — để admin biết mình đang lấy tỉnh từ đâu.
  const ownerByProvince = new Map<string, string>();
  for (const other of zones) {
    if (other.id === zone?.id) continue;
    for (const code of other.provinces) ownerByProvince.set(code, other.name);
  }

  const toggle = (code: string) =>
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={zone?.id ?? ''} />
      {selected.map((code) => (
        <input key={code} type="hidden" name="provinces" value={code} />
      ))}

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block space-y-1 text-sm sm:col-span-2">
          Tên khu vực
          <input
            name="name"
            className={inputClass}
            defaultValue={zone?.name ?? ''}
            required
            maxLength={100}
            placeholder="Ví dụ: Nội thành"
          />
        </label>
        <label className="block space-y-1 text-sm">
          Phí ship (đ)
          <input
            name="feeVnd"
            type="number"
            min="0"
            step="1000"
            className={inputClass}
            defaultValue={zone?.feeVnd ?? 30000}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          Miễn ship từ (đ)
          <input
            name="freeShipFromVnd"
            type="number"
            min="0"
            step="10000"
            className={inputClass}
            defaultValue={zone?.freeShipFromVnd ?? ''}
            placeholder="Để trống = không"
          />
        </label>
      </div>

      <label className="block max-w-40 space-y-1 text-sm">
        Thứ tự ưu tiên
        <input
          name="sortOrder"
          type="number"
          min="0"
          step="1"
          className={inputClass}
          defaultValue={zone?.sortOrder ?? 10}
        />
        <span className="text-muted-foreground text-xs">Số nhỏ được ưu tiên trước.</span>
      </label>

      {isDefault ? (
        <p className="text-muted-foreground text-xs">
          Khu mặc định áp dụng cho mọi tỉnh không thuộc khu nào khác, nên không cần chọn tỉnh.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">Tỉnh/thành áp dụng ({selected.length})</p>
          <div className="border-border grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROVINCES.map((province) => {
              const owner = ownerByProvince.get(province.code);
              return (
                <label
                  key={province.code}
                  className="flex items-center gap-2 text-sm"
                  title={owner ? `Đang ở khu ${owner}` : undefined}
                >
                  <input
                    type="checkbox"
                    className="accent-primary size-4"
                    checked={selected.includes(province.code)}
                    onChange={() => toggle(province.code)}
                  />
                  <span className="truncate">
                    {province.name}
                    {owner && (
                      <span className="text-muted-foreground text-xs"> (đang ở khu {owner})</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-emerald-600">
          {state.success}
        </p>
      )}

      <Button type="submit" size="sm" disabled={pending}>
        {zone ? <Save className="size-4" /> : <Plus className="size-4" />}
        {pending ? 'Đang lưu…' : zone ? 'Lưu khu vực' : 'Thêm khu vực'}
      </Button>
    </form>
  );
}

function DeleteZoneButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteShippingZone, initialState);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="text-muted-foreground hover:text-destructive"
        title="Xóa khu vực"
      >
        <Trash2 className="size-4" />
      </Button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function ShippingZoneManager({ zones }: { zones: ZoneView[] }) {
  return (
    <div className="space-y-6">
      {zones.map((zone) => (
        <Card key={zone.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {zone.name}
              {zone.isDefault && <Badge variant="secondary">Mặc định</Badge>}
              <span className="text-muted-foreground text-xs font-normal">
                {zone.feeVnd.toLocaleString('vi-VN')} đ
                {zone.freeShipFromVnd !== null &&
                  ` · miễn phí từ ${zone.freeShipFromVnd.toLocaleString('vi-VN')} đ`}
              </span>
            </CardTitle>
            {!zone.isDefault && <DeleteZoneButton id={zone.id} />}
          </CardHeader>
          <CardContent>
            <ZoneForm zone={zone} zones={zones} />
          </CardContent>
        </Card>
      ))}

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thêm khu vực mới</CardTitle>
        </CardHeader>
        <CardContent>
          <ZoneForm zones={zones} />
        </CardContent>
      </Card>
    </div>
  );
}
