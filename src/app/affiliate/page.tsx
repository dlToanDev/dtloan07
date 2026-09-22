import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { AffiliateList } from '@/components/affiliate/affiliate-list';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { Info, Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Ưu đãi & Công cụ khuyên dùng (Affiliate Deals)',
  description:
    'Danh sách mã giảm giá, voucher và ưu đãi máy chủ VPS, Cloud, tên miền, công cụ lập trình AI được chọn lọc và kiểm chứng thực tế.',
  pathname: '/affiliate',
});

export const revalidate = 60; // ISR 60 giây

export default async function AffiliatePage() {
  let deals: Awaited<ReturnType<typeof db.affiliateItem.findMany>> = [];
  try {
    deals = await db.affiliateItem.findMany({
      where: { active: true },
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
          <span>Tiết kiệm chi phí & Công cụ chuẩn DevOps</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Ưu đãi & Công cụ khuyên dùng
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
          Tập hợp các dịch vụ hạ tầng Cloud VPS, tên miền, và công cụ lập trình mà tôi đã trực tiếp
          sử dụng, đánh giá cao và đàm phán được các mã giảm giá/credit tốt nhất cho bạn.
        </p>
      </div>

      {/* Affiliate Disclosure (Thông báo minh bạch pháp lý chuẩn FTC/Google) */}
      <div className="border-border/80 bg-muted/40 text-muted-foreground flex items-start gap-3.5 rounded-xl border p-4 text-xs sm:p-5 sm:text-sm">
        <Info className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="text-foreground font-semibold">Cam kết minh bạch & Trải nghiệm độc giả:</p>
          <p className="leading-relaxed">
            Một số liên kết trên trang này là liên kết tiếp thị (affiliate links hoặc link rút gọn).
            Nếu bạn đăng ký hoặc mua qua liên kết, blog có thể nhận được một khoản hoa hồng nhỏ để
            trang trải chi phí máy chủ mà bạn{' '}
            <strong>không phải trả thêm bất kỳ chi phí nào</strong> (nhiều liên kết còn tặng thêm
            credit và mã giảm giá độc quyền cho bạn). Tôi chỉ giới thiệu những dịch vụ bản thân đã
            kiểm nghiệm chất lượng.
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
              Mọi công cụ và nhà cung cấp VPS đều đang vận hành hệ thống thật của blog.
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
              Mỗi lượt đăng ký qua link giúp blog duy trì máy chủ và chia sẻ thêm nhiều bài viết
              miễn phí.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
