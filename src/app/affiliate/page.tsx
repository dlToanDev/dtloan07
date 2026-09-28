import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { AffiliateList } from '@/components/affiliate/affiliate-list';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { Info, Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Sản phẩm Affiliate chọn lọc',
  description:
    'Tìm kiếm sản phẩm Affiliate từ Shopee, TikTok Shop và các nền tảng khác, được dltoan07 chọn lọc.',
  pathname: '/affiliate',
});

export const revalidate = 60; // ISR 60 giây

export default async function AffiliatePage() {
  let deals: Awaited<ReturnType<typeof db.affiliateItem.findMany>> = [];
  try {
    deals = await db.affiliateItem.findMany({
      // Nhóm Tool Code đã ngừng dùng (bỏ trang "Công cụ Affiliate") nên không hiển thị nữa.
      where: { active: true, category: { not: 'TOOLCODE' } },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });
  } catch (err) {
    console.warn('Cảnh báo: Không thể tải danh sách affiliate lúc build:', err);
  }

  return (
    <Container className="space-y-10 py-12 sm:py-16">
      {/* Hero Header */}
      <div className="max-w-2xl space-y-3">
        <div className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
          <Sparkles className="size-3.5" />
          <span>Shopee • TikTok Shop • Công cụ & Dịch vụ</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Sản phẩm Affiliate chọn lọc
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
          Tìm nhanh sản phẩm theo sàn, nền tảng hoặc từ khóa. Bấm trực tiếp vào sản phẩm để xem
          thông tin trên trang bán hàng.
        </p>
      </div>

      {/* Affiliate Disclosure (Thông báo minh bạch pháp lý chuẩn FTC/Google) */}
      <div className="border-border/80 bg-muted/40 text-muted-foreground flex items-start gap-3.5 rounded-xl border p-4 text-xs sm:p-5 sm:text-sm">
        <Info className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="text-foreground font-semibold">Cam kết minh bạch & Trải nghiệm độc giả:</p>
          <p className="leading-relaxed">
            Một số liên kết trên trang này là liên kết tiếp thị (affiliate links hoặc link rút gọn).
            Nếu bạn đăng ký hoặc mua qua liên kết, dltoan07 có thể nhận một khoản hoa hồng nhỏ,
            nhưng bạn <strong>không phải trả thêm bất kỳ chi phí nào</strong>. Sản phẩm được trình
            bày ngắn gọn để bạn dễ tìm và so sánh.
          </p>
        </div>
      </div>

      {/* Danh sách deals & bộ lọc */}
      <AffiliateList initialDeals={deals} />

      {/* Giá trị cốt lõi */}
      <div className="border-border grid gap-6 border-t pt-12 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Đã kiểm chứng thực tế</h4>
            <p className="text-muted-foreground mt-1 text-xs">
              Mọi công cụ và nhà cung cấp VPS đều đã được kiểm tra trong quá trình sử dụng thực tế.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Ưu đãi độc quyền</h4>
            <p className="text-muted-foreground mt-1 text-xs">
              Cập nhật liên tục các voucher, credit tặng thêm từ các nhà cung cấp uy tín.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <HeartHandshake className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Ủng hộ cộng đồng</h4>
            <p className="text-muted-foreground mt-1 text-xs">
              Mỗi lượt đăng ký qua link giúp dltoan07 duy trì máy chủ và tiếp tục chia sẻ nội dung
              miễn phí cho cộng đồng.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
