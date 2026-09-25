import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireProductAdmin } from '@/server/actions/product';
import { ProductForm } from '@/components/admin/product-form';

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
    </div>
  );
}
