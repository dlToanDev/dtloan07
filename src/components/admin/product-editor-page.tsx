import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireProductAdmin } from '@/server/actions/product';
import { ProductForm } from '@/components/admin/product-form';
import { AccountStockManager } from '@/components/admin/shop/account-stock-manager';
import { isCredentialKeyConfigured } from '@/lib/crypto/credentials';

export async function ProductEditorPage({
  kind,
  id,
}: {
  kind: 'SOURCE_CODE' | 'SHOP';
  id?: string;
}) {
  await requireProductAdmin();
  const product = id
    ? await db.product.findUnique({
        where: { id },
        include: {
          files: true,
          variants: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
          _count: { select: { orderItems: true } },
        },
      })
    : null;
  if (id && (!product || product.kind !== kind)) notFound();

  const accountStock =
    product?.type === 'ACCOUNT' && product.deliveryMode === 'AUTO'
      ? await db.accountStock.findMany({
          where: { variant: { productId: product.id } },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          take: 500,
          include: {
            variant: { select: { name: true } },
            orderItem: { select: { order: { select: { orderCode: true } } } },
          },
        })
      : [];

  const basePath = kind === 'SOURCE_CODE' ? '/admin/source-code' : '/admin/shop';
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href={basePath} className="text-muted-foreground text-sm hover:underline">
          ← Quay lại danh sách
        </Link>
        <h1 className="text-2xl font-bold">
          {id ? 'Chỉnh sửa sản phẩm' : 'Đăng bán'}{' '}
          {kind === 'SOURCE_CODE' ? 'Source Code / App / Tool' : 'sản phẩm Shop'}
        </h1>
        <p className="text-muted-foreground text-sm">
          Thêm thông tin sản phẩm, mô tả tính năng, ảnh demo, giá bán và file bàn giao cho khách.
        </p>
      </div>
      <ProductForm
        key={product?.updatedAt.toISOString() || 'new'}
        kind={kind}
        product={
          product
            ? {
                id: product.id,
                name: product.name,
                slug: product.slug,
                shortDesc: product.shortDesc,
                description: product.description,
                version: product.version,
                kind: product.kind,
                saleMode: product.saleMode,
                status: product.status,
                priceVnd: product.priceVnd,
                coverUrl: product.coverUrl,
                type: product.type,
                category: product.category,
                condition: product.condition,
                conditionNote: product.conditionNote,
                warrantyNote: product.warrantyNote,
                deliveryMode: product.deliveryMode,
                gallery: product.gallery,
                hasOrders: product._count.orderItems > 0,
                variants: product.variants.map((variant) => ({
                  id: variant.id,
                  name: variant.name,
                  sku: variant.sku,
                  priceVnd: variant.priceVnd,
                  compareAtVnd: variant.compareAtVnd,
                  stock: variant.stock,
                  active: variant.active,
                })),
              }
            : undefined
        }
        files={product?.files.map((file) => ({
          id: file.id,
          label: file.label,
          version: file.version,
          sizeBytes: Number(file.sizeBytes),
        }))}
      />

      {/* Kho tài khoản chỉ dùng cho hàng ACCOUNT bàn giao tự động */}
      {product?.type === 'ACCOUNT' && product.deliveryMode === 'AUTO' && (
        <section className="border-border bg-card space-y-4 rounded-xl border p-5">
          <div>
            <h2 className="font-semibold">Kho tài khoản</h2>
            <p className="text-muted-foreground text-sm">
              Mỗi dòng là một tài khoản sẽ được gửi tự động cho khách ngay sau khi thanh toán.
            </p>
          </div>
          <AccountStockManager
            keyConfigured={isCredentialKeyConfigured()}
            variants={product.variants.map((variant) => ({
              id: variant.id,
              name: variant.name,
            }))}
            rows={accountStock.map((row) => ({
              id: row.id,
              variantId: row.variantId,
              variantName: row.variant.name,
              status: row.status,
              orderCode: row.orderItem?.order.orderCode ?? null,
              createdAt: new Date(row.createdAt).toLocaleString('vi-VN'),
              deliveredAt: row.deliveredAt
                ? new Date(row.deliveredAt).toLocaleString('vi-VN')
                : null,
            }))}
          />
        </section>
      )}
    </div>
  );
}
