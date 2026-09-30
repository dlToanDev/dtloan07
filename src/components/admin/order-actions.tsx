'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { advanceFulfillment, cancelOrder, type OrderActionState } from '@/server/actions/order';
import { deliverManualAccount, type AccountStockState } from '@/server/actions/account-stock';

const initialState: OrderActionState = {};

function Feedback({ state }: { state: OrderActionState | AccountStockState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm text-red-600">
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p role="status" className="text-sm text-emerald-600">
        {state.success}
      </p>
    );
  return null;
}

export function FulfillmentActions({
  orderId,
  fulfillmentStatus,
  paymentMethod,
  trackingCode,
}: {
  orderId: string;
  fulfillmentStatus: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  paymentMethod: 'PAYOS' | 'COD' | 'WALLET';
  trackingCode: string | null;
}) {
  const [state, action, pending] = useActionState(advanceFulfillment, initialState);
  const [tracking, setTracking] = useState(trackingCode ?? '');

  if (fulfillmentStatus === 'DELIVERED' || fulfillmentStatus === 'CANCELLED') {
    return <Feedback state={state} />;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />

      {fulfillmentStatus === 'CONFIRMED' && (
        <label className="block space-y-1 text-sm">
          Mã vận đơn (tuỳ chọn)
          <input
            name="trackingCode"
            className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm"
            value={tracking}
            onChange={(event) => setTracking(event.target.value)}
            maxLength={64}
            placeholder="Ví dụ: GHN123456789"
          />
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        {fulfillmentStatus === 'PENDING' && (
          <Button type="submit" name="action" value="CONFIRM" disabled={pending}>
            Xác nhận đơn
          </Button>
        )}
        {fulfillmentStatus === 'CONFIRMED' && (
          <Button type="submit" name="action" value="SHIP" disabled={pending}>
            Bắt đầu giao hàng
          </Button>
        )}
        {fulfillmentStatus === 'SHIPPING' && (
          <Button
            type="submit"
            name="action"
            value="DELIVER"
            disabled={pending}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {paymentMethod === 'COD' ? 'Đã giao & đã thu tiền' : 'Đã giao'}
          </Button>
        )}
      </div>

      <Feedback state={state} />
    </form>
  );
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(cancelOrder, initialState);
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Hủy đơn và trả lại tồn kho?</span>
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            {pending ? 'Đang hủy…' : 'Xác nhận hủy'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Không
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setConfirming(true)}
        >
          Hủy đơn
        </Button>
      )}
      <Feedback state={state} />
    </form>
  );
}

export function ManualAccountDelivery({
  orderItemId,
  label,
  delivered,
}: {
  orderItemId: string;
  label: string;
  delivered: boolean;
}) {
  const [state, action, pending] = useActionState(deliverManualAccount, {} as AccountStockState);

  if (delivered && !state.success) {
    return (
      <p className="text-muted-foreground text-xs">
        Đã bàn giao tài khoản cho khách. Thông tin được lưu mã hóa, khách xem lại trong trang đơn
        hàng.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="orderItemId" value={orderItemId} />
      <label className="block space-y-1 text-sm">
        Thông tin tài khoản cho &ldquo;{label}&rdquo;
        <textarea
          name="credentials"
          rows={3}
          required
          placeholder={'email|mật khẩu|ghi chú'}
          className="border-border bg-background w-full rounded-lg border px-3 py-2 font-mono text-sm"
        />
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Đang gửi…' : 'Bàn giao & gửi email'}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
