import { siteConfig } from '@/config/site';
import { getAffiliatePath } from '@/lib/affiliate-token';
import { getServerTranslator } from '@/lib/i18n/server';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, Truck, ShieldCheck, BookOpen, ShoppingBag } from 'lucide-react';

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.87-4.49V8.52a8.27 8.27 0 0 0 4.84 1.56v-3.4a4.85 4.85 0 0 1-.94.01z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

export async function Footer() {
  const { t } = await getServerTranslator();

  const trustFeatures = [
    {
      icon: Truck,
      title: t('footer.trust_delivery_title', 'Ship nhanh & Bàn giao 24/7'),
      desc: t(
        'footer.trust_delivery_desc',
        'Cấp mã bản quyền & tài khoản tự động sau 5s, giao hàng vật lý siêu tốc toàn quốc.',
      ),
    },
    {
      icon: ShieldCheck,
      title: t('footer.trust_quality_title', 'Đồ chất lượng & Uy tín'),
      desc: t(
        'footer.trust_quality_desc',
        'Mã nguồn chuẩn Production, tài nguyên số chính hãng, bảo hành rõ ràng.',
      ),
    },
    {
      icon: BookOpen,
      title: t('footer.trust_knowledge_title', 'Chia sẻ kiến thức & Kinh nghiệm'),
      desc: t(
        'footer.trust_knowledge_desc',
        'Blog thực chiến về Linux, Docker, DevOps, tối ưu máy chủ và lập trình.',
      ),
    },
    {
      icon: ShoppingBag,
      title: t('footer.trust_shop_title', 'Shop tài nguyên & Khóa học'),
      desc: t(
        'footer.trust_shop_desc',
        'Kho phần mềm, source code độc quyền và các khóa học chất lượng cao.',
      ),
    },
  ];

  return (
    <footer id="footer" className="border-border bg-muted/20 mt-16 border-t">
      {/* 1. THANH CAM KẾT & TIÊU CHÍ UY TÍN */}
      <div className="border-border/60 bg-card/50 border-b">
        <div className="container-page py-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="flex items-start gap-3.5">
                  <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl shadow-xs">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-foreground text-xs font-bold sm:text-sm">{feat.title}</h4>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC NỘI DUNG CHÍNH CỦA FOOTER */}
      <div className="container-page py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Cột 1: Giới thiệu bản thân tác giả & Blog (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src={siteConfig.logo}
                alt={siteConfig.name}
                width={56}
                height={32}
                className="h-8 w-auto rounded object-contain"
              />
              <span className="text-foreground text-lg font-black tracking-tight">
                {siteConfig.name}
              </span>
            </Link>

            <div className="space-y-2 text-xs leading-relaxed">
              <p className="text-foreground font-semibold">
                {t('footer.greeting', 'Xin chào, mình là')}{' '}
                <span className="text-primary font-bold">{siteConfig.author.name}</span>.
              </p>
              <p className="text-muted-foreground">
                {t('footer.bio_intro', 'Hiện đang sinh sống và làm việc tại')}{' '}
                <strong className="text-foreground font-semibold">
                  {t('footer.bio_location', 'Hà Nội')}
                </strong>
                .{' '}
                {t(
                  'footer.bio_desc',
                  'Blog là nơi mình chia sẻ kiến thức, kinh nghiệm thực tế về lập trình backend, quản trị server Linux, Docker, DevOps cũng như cung cấp các sản phẩm số, template và khóa học chất lượng cao.',
                )}
              </p>
              <p className="text-muted-foreground">
                {t(
                  'footer.bio_warranty',
                  'Tất cả các sản phẩm số tại Shop đều được kiểm tra kỹ lưỡng, hỗ trợ kỹ thuật tận tâm và giao dịch bảo mật 100%.',
                )}
              </p>
            </div>

            {/* Mạng xã hội */}
            <div className="pt-2">
              <span className="text-muted-foreground mb-2.5 block text-xs font-semibold">
                {t('footer.social_connect', 'Kết nối với mình qua mạng xã hội:')}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={siteConfig.links.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-card hover:border-primary/50 hover:text-primary text-muted-foreground flex size-8 items-center justify-center rounded-lg border shadow-xs transition"
                  title="Facebook Fanpage: dltoan07"
                >
                  <FacebookIcon className="size-4" />
                </a>
                <a
                  href={siteConfig.links.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-card text-muted-foreground flex size-8 items-center justify-center rounded-lg border shadow-xs transition hover:border-red-500/50 hover:text-red-500"
                  title="YouTube: dltoan07"
                >
                  <YoutubeIcon className="size-4" />
                </a>
                <a
                  href={siteConfig.links.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-card hover:border-foreground hover:text-foreground text-muted-foreground flex size-8 items-center justify-center rounded-lg border shadow-xs transition"
                  title="TikTok: dltoan07"
                >
                  <TikTokIcon className="size-4" />
                </a>
                <a
                  href={siteConfig.links.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-card text-muted-foreground flex size-8 items-center justify-center rounded-lg border shadow-xs transition hover:border-sky-500/50 hover:text-sky-500"
                  title="Telegram: dltoan07Blog"
                >
                  <TelegramIcon className="size-4" />
                </a>
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-card hover:border-foreground hover:text-foreground text-muted-foreground flex size-8 items-center justify-center rounded-lg border shadow-xs transition"
                  title="GitHub: dltoan07"
                >
                  <GithubIcon className="size-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Cột 2: Thông tin liên hệ trực tiếp (3 cols) */}
          <div className="space-y-4 lg:col-span-3">
            <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
              {t('footer.contact_info', 'Thông tin liên hệ')}
            </h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground font-medium">
                    {t('footer.address', 'Địa chỉ')}:{' '}
                  </strong>
                  {siteConfig.author.address}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="text-primary size-4 shrink-0" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground font-medium">
                    {t('footer.hotline', 'Hotline / Zalo')}:{' '}
                  </strong>
                  <a
                    href={`tel:${siteConfig.author.phone}`}
                    className="text-foreground hover:text-primary font-bold transition"
                  >
                    {siteConfig.author.phone}
                  </a>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="text-primary size-4 shrink-0" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground font-medium">
                    {t('footer.email', 'Email')}:{' '}
                  </strong>
                  <a
                    href={`mailto:${siteConfig.author.email}`}
                    className="text-foreground hover:text-primary font-medium underline underline-offset-2 transition"
                  >
                    {siteConfig.author.email}
                  </a>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <TelegramIcon className="text-primary size-4 shrink-0" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground font-medium">
                    {t('footer.telegram', 'Telegram')}:{' '}
                  </strong>
                  <a
                    href={siteConfig.links.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary font-medium transition"
                  >
                    @dltoan07Blog
                  </a>
                </span>
              </li>
            </ul>
          </div>

          {/* Cột 3: Khám phá dịch vụ (2 cols) */}
          <div className="space-y-4 lg:col-span-2">
            <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
              {t('footer.explore', 'Khám phá')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  {t('footer.latest_posts', 'Bài viết mới nhất')}
                </Link>
              </li>
              <li>
                <Link
                  href="/courses"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  {t('footer.courses', 'Khóa học lập trình')}
                </Link>
              </li>
              <li>
                <Link
                  href={siteConfig.shopPath}
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  {t('footer.shop', 'Shop sản phẩm số')}
                </Link>
              </li>
              <li>
                <Link
                  href={getAffiliatePath()}
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  {t('footer.deals', 'Ưu đãi & Khuyến mãi')}
                </Link>
              </li>
              <li>
                <Link
                  href="/account?tab=wallet"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  {t('footer.deposit_wallet', 'Nạp tiền ví tài khoản')}
                </Link>
              </li>
              <li>
                <Link
                  href="/account?tab=pro"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  {t('footer.pro_account', 'Đăng ký tài khoản PRO')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 4: Hỗ trợ & Chính sách (2 cols) */}
          <div className="space-y-4 lg:col-span-2">
            <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
              {t('footer.support_policy', 'Hỗ trợ & Pháp lý')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/orders/lookup"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  {t('footer.order_lookup', 'Tra cứu đơn hàng')}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  {t('footer.terms', 'Điều khoản dịch vụ')}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  {t('footer.privacy', 'Chính sách bảo mật')}
                </Link>
              </li>
              <li>
                <Link
                  href="/rss.xml"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  {t('footer.rss', 'Nguồn tin RSS')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. DÒNG BẢN QUYỀN CHÂN TRANG */}
      <div className="border-border/60 bg-card/30 border-t py-5">
        <div className="container-page flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()}{' '}
            <strong className="text-foreground">{siteConfig.name}</strong>.{' '}
            {t('footer.rights_reserved', 'Bản quyền thuộc về')}{' '}
            <strong className="text-foreground">{siteConfig.author.name}</strong> (
            {siteConfig.author.address}).
          </p>
          <div className="text-muted-foreground flex items-center gap-4 text-xs">
            <span>{t('footer.slogan', 'Uy tín • Ship nhanh • Chất lượng')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
