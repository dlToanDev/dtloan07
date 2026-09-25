import { ProductDetailPage, productMetadata } from '@/components/shop/product-detail-page';
type Props = { params: Promise<{ slug: string }> };
export function generateMetadata(props: Props) {
  return productMetadata({ ...props, kind: 'SOURCE_CODE' });
}
export default function Page(props: Props) {
  return <ProductDetailPage {...props} kind="SOURCE_CODE" />;
}
