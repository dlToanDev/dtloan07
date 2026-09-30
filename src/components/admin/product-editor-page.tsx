import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireProductAdmin } from '@/server/actions/product';
import { ProductForm } from '@/components/admin/product-form';
import { AccountStockManager } from '@/components/admin/shop/account-stock-manager';
import { FormSection } from '@/components/admin/shop/form-section';
import { isCredentialKeyConfigured } from '@/lib/crypto/credentials';

export async function ProductEditorPage({
  id,
  basePath = '/admin/products',
}: {
  id?: string;
  basePath?: string;
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
  if (id && !product) notFound();

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

  const categories = await db.productCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, hasCondition: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <Link href={basePath} className="text-muted-foreground text-sm hover:underline">
          ← Danh sách sản phẩm
        </Link>
        <h1 className="text-2xl font-bold">
          {id ? product?.name || 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
        </h1>
      </div>
      <ProductForm
        key={product?.updatedAt.toISOString() || 'new'}
        credentialKeyConfigured={isCredentialKeyConfigured()}
        categories={categories}
        accountAvailable={
          product?.type === 'ACCOUNT' && product.deliveryMode === 'AUTO'
            ? accountStock.filter((row) => row.status === 'AVAILABLE').length
            : null
        }
        product={
          product
            ? {
                id: product.id,
                name: product.name,
                slug: product.slug,
                shortDesc: product.shortDesc,
                description: product.description,
                version: product.version,
                saleMode: product.saleMode,
                status: product.status,
                priceVnd: product.priceVnd,
                coverUrl: product.coverUrl,
                type: product.type,
                category: product.categoryId,
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
      >
        {/* Kho tài khoản chỉ dùng cho hàng ACCOUNT bàn giao tự động; có form riêng nên nằm ngoài form sản phẩm. */}
        {product?.type === 'ACCOUNT' && product.deliveryMode === 'AUTO' && (
          <FormSection
            title="Tài khoản trong kho"
            hint="Tài khoản đã nhập, trạng thái giao cho khách. Số tài khoản còn trống chính là số lượng đang bán."
          >
            <AccountStockManager
              keyConfigured={isCredentialKeyConfigured()}
              showImport={product.variants.length > 1}
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
          </FormSection>
        )}
      </ProductForm>
    </div>
  );
}
