'use client';

import { useActionState, useState } from 'react';
import { Eye, PackagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  deleteAccountStock,
  importAccountStock,
  replaceAccountStock,
  revealAccountStock,
  type AccountStockState,
} from '@/server/actions/account-stock';

export interface AccountStockRow {
  id: string;
  variantId: string;
  variantName: string;
  status: 'AVAILABLE' | 'RESERVED' | 'DELIVERED' | 'REVOKED';
  orderCode: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

const STATUS_LABEL: Record<AccountStockRow['status'], string> = {
  AVAILABLE: 'Còn trống',
  RESERVED: 'Đang giữ chỗ',
  DELIVERED: 'Đã bàn giao',
  REVOKED: 'Đã thu hồi',
};

const initialState: AccountStockState = {};

function ImportForm({ variants }: { variants: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(importAccountStock, initialState);

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
        <label className="block space-y-1 text-sm">
          Biến thể
          <select
            name="variantId"
            required
            className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm"
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          Danh sách tài khoản — mỗi dòng một tài khoản
          <textarea
            name="bulk"
            required
            rows={5}
            placeholder={'email1@domain.com|matkhau1|ghi chú\nemail2@domain.com|matkhau2'}
            className="border-border bg-background w-full rounded-lg border px-3 py-2 font-mono text-sm"
          />
        </label>
      </div>

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
        <PackagePlus className="size-4" />
        {pending ? 'Đang nhập…' : 'Nhập kho'}
      </Button>
      <p className="text-muted-foreground text-xs">
        Nội dung được mã hóa AES-256-GCM trước khi lưu. Sau khi nhập, bạn chỉ xem lại được từng dòng
        qua nút 👁 và mỗi lần xem đều được ghi nhật ký.
      </p>
    </form>
  );
}

function RowActions({ row }: { row: AccountStockRow }) {
  const [revealState, reveal, revealing] = useActionState(revealAccountStock, initialState);
  const [deleteState, remove, removing] = useActionState(deleteAccountStock, initialState);
  const [replaceState, replace, replacing] = useActionState(replaceAccountStock, initialState);
  const [showValue, setShowValue] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-end gap-1">
        <form action={reveal}>
          <input type="hidden" name="id" value={row.id} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={revealing}
            title="Xem thông tin tài khoản (ghi nhật ký)"
            onClick={() => setShowValue(true)}
          >
            <Eye className="size-4" />
          </Button>
        </form>

        {row.status === 'DELIVERED' && (
          <form action={replace}>
            <input type="hidden" name="id" value={row.id} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={replacing}
              title="Đổi tài khoản khác cho khách (bảo hành)"
            >
              <RefreshCw className="size-4" />
            </Button>
          </form>
        )}

        {row.status === 'AVAILABLE' && (
          <form action={remove}>
            <input type="hidden" name="id" value={row.id} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={removing}
              className="text-muted-foreground hover:text-destructive"
              title="Xóa khỏi kho"
            >
              <Trash2 className="size-4" />
            </Button>
          </form>
        )}
      </div>

      {showValue && revealState.revealed && (
        <pre className="bg-muted max-w-xs overflow-x-auto rounded p-2 text-left font-mono text-xs break-all whitespace-pre-wrap">
          {revealState.revealed}
        </pre>
      )}
      {[revealState.error, deleteState.error, replaceState.error].filter(Boolean).map((message) => (
        <p key={message} role="alert" className="text-right text-xs text-red-600">
          {message}
        </p>
      ))}
      {[deleteState.success, replaceState.success].filter(Boolean).map((message) => (
        <p key={message} role="status" className="text-right text-xs text-emerald-600">
          {message}
        </p>
      ))}
    </div>
  );
}

export function AccountStockManager({
  variants,
  rows,
  keyConfigured,
}: {
  variants: { id: string; name: string }[];
  rows: AccountStockRow[];
  keyConfigured: boolean;
}) {
  const available = rows.filter((row) => row.status === 'AVAILABLE').length;

  return (
    <div className="space-y-5">
      {!keyConfigured && (
        <p role="alert" className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">
          Chưa cấu hình <code>ACCOUNT_ENCRYPTION_KEY</code> trong <code>.env</code>. Sinh khóa bằng{' '}
          <code>openssl rand -base64 32</code> rồi khởi động lại server — trước khi có khóa, không
          nhập kho và không bán được tài khoản tự động.
        </p>
      )}

      <div className="text-muted-foreground text-sm">
        Tổng kho: <strong className="text-foreground">{rows.length}</strong> · Còn trống:{' '}
        <strong className="text-foreground">{available}</strong>
      </div>

      <ImportForm variants={variants} />

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-muted-foreground border-border border-b text-xs uppercase">
              <tr>
                <th className="py-2">Biến thể</th>
                <th className="py-2">Trạng thái</th>
                <th className="py-2">Đơn hàng</th>
                <th className="py-2">Ngày nhập</th>
                <th className="py-2">Ngày giao</th>
                <th className="py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-2">{row.variantName}</td>
                  <td className="py-2">
                    <Badge
                      variant={
                        row.status === 'AVAILABLE'
                          ? 'default'
                          : row.status === 'REVOKED'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      {STATUS_LABEL[row.status]}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground py-2 font-mono text-xs">
                    {row.orderCode ?? '—'}
                  </td>
                  <td className="text-muted-foreground py-2 text-xs">{row.createdAt}</td>
                  <td className="text-muted-foreground py-2 text-xs">{row.deliveredAt ?? '—'}</td>
                  <td className="py-2 text-right">
                    <RowActions row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
